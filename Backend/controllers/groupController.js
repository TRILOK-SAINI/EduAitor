import Group from "../models/group.js";
import Message from "../models/message.js";
import Student from "../models/student.js";
import Teacher from "../models/teacher.js";
import Class from "../models/class.js";

// ─── Auth normalizer ──────────────────────────────────────────────────────────
// JWT payload shape: { role, school_id, teacher_id?, email, name? }
// role values: "super_admin" | "school_admin" | "teacher_admin"

const normalizeUser = (jwtUser) => {
  let userType = null;
  let userId = null;

  if (jwtUser.role === "teacher_admin") {
    userType = "teacher";
    userId = jwtUser.teacher_id;
  } else if (jwtUser.role === "school_admin") {
    userType = "admin";
    userId = jwtUser.school_id;
  } else if (jwtUser.role === "student_admin") {
    userType = "student";
    userId = jwtUser.student_id;
  } else if (jwtUser.role === "parent_admin") {
    userType = "student";
    userId = jwtUser.student_id; // parent mapped to child for group membership
  } else if (jwtUser.role === "staff_admin") {
    userType = "staff";
    userId = jwtUser.staff_id;
  }

  return {
    userId,
    userType,
    schoolId: jwtUser.school_id,
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isMember = (group, userId) =>
  group.members.some((m) => m.userId.toString() === userId.toString());

// Resolve a broadcast "audience" selection into a flat member list.
// audience = {
//   allUsers: bool,      -> every student + every teacher in the school
//   allStudents: bool,   -> every student in the school (or in classIds, if given)
//   allTeachers: bool,   -> every teacher in the school (or assigned to classIds, if given)
//   classIds: [ids],     -> optional scope: only students/teachers of these classes
// }
const resolveAudienceMembers = async ({ schoolId, audience }) => {
  if (!audience) return [];

  const { allUsers, allStudents, allTeachers, classIds } = audience;
  const wantStudents = allUsers || allStudents;
  const wantTeachers = allUsers || allTeachers;

  if (!wantStudents && !wantTeachers) return [];

  const scopedToClasses = Array.isArray(classIds) && classIds.length > 0;

  const members = [];

  if (wantStudents) {
    const studentFilter = { schoolId };
    if (scopedToClasses) studentFilter.classId = { $in: classIds };

    const students = await Student.find(studentFilter).select("_id");
    members.push(
      ...students.map((s) => ({ userId: s._id, userType: "student" })),
    );
  }

  if (wantTeachers) {
    const teacherFilter = { schoolId };
    if (scopedToClasses) teacherFilter.assignedClasses = { $in: classIds };

    const teachers = await Teacher.find(teacherFilter).select("_id");
    members.push(
      ...teachers.map((t) => ({ userId: t._id, userType: "teacher" })),
    );
  }

  return members;
};

// ─── Group CRUD ───────────────────────────────────────────────────────────────

/**
 * POST /groups/create
 * Body: { name, type, description?, classId?, sectionId?, subjectId? }
 * Auth: school_admin or teacher_admin
 */
export const createGroup = async (req, res) => {
  try {
    const { userId, userType, schoolId } = normalizeUser(req.user);

    if (!schoolId || !["admin", "teacher"].includes(userType)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const {
      name,
      type,
      description,
      classId,
      sectionId,
      subjectId,
      audience,
      permissions,
    } = req.body;

    const validatePermissionArray = (arr, fieldName) => {
      if (arr === undefined) return { valid: true, value: undefined };
      if (!Array.isArray(arr)) {
        return {
          valid: false,
          message: `${fieldName} must be an array`,
        };
      }

      const allowedRoles = ["teacher", "student", "admin", "staff"];
      const invalid = arr.filter((role) => !allowedRoles.includes(role));
      if (invalid.length > 0) {
        return {
          valid: false,
          message: `Invalid ${fieldName}: ${invalid.join(", ")}`,
        };
      }

      return {
        valid: true,
        value: [...new Set(arr)],
      };
    };

    const canPostValidation = validatePermissionArray(
      permissions?.canPost,
      "permissions.canPost",
    );
    if (!canPostValidation.valid) {
      return res
        .status(400)
        .json({ success: false, message: canPostValidation.message });
    }

    const canCommentValidation = validatePermissionArray(
      permissions?.canComment,
      "permissions.canComment",
    );
    if (!canCommentValidation.valid) {
      return res
        .status(400)
        .json({ success: false, message: canCommentValidation.message });
    }

    let groupPermissions;
    if (canPostValidation.value !== undefined) {
      groupPermissions = {
        ...(groupPermissions || {}),
        canPost: canPostValidation.value,
      };
    }
    if (canCommentValidation.value !== undefined) {
      groupPermissions = {
        ...(groupPermissions || {}),
        canComment: canCommentValidation.value,
      };
    }

    if (
      (type === "broadcast" || type === "announcement") &&
      groupPermissions?.canPost === undefined
    ) {
      groupPermissions = {
        ...(groupPermissions || {}),
        canPost: ["admin"],
      };
    }

    let members = [];

    // ─── CLASS GROUP ─────────────────────────────
    if (type === "class") {
      const students = await Student.find({ schoolId, classId }).select("_id");

      const teachers = await Teacher.find({
        schoolId,
        assignedClasses: classId,
      }).select("_id");

      members = [
        ...students.map((s) => ({
          userId: s._id,
          userType: "student",
        })),
        ...teachers.map((t) => ({
          userId: t._id,
          userType: "teacher",
        })),
      ];
    }

    // ─── SECTION GROUP ───────────────────────────
    if (type === "section") {
      const students = await Student.find({
        schoolId,
        classId,
        sectionId,
      }).select("_id");

      members = students.map((s) => ({
        userId: s._id,
        userType: "student",
      }));
    }

    // ─── SUBJECT GROUP ───────────────────────────
    if (type === "subject") {
      const students = await Student.find({
        schoolId,
        classId,
        sectionId,
      }).select("_id");

      const classData = await Class.findById(classId);

      if (!classData) {
        return res.status(400).json({
          success: false,
          message: "Class not found",
        });
      }

      let teacherIds = [];

      const section = classData?.details.find(
        (d) => d.sectionId?.toString() === sectionId,
      );

      if (section) {
        teacherIds = (section.subjectTeachers || [])
          .filter((st) => st.subjectId?.toString() === subjectId)
          .map((st) => st.teacherId)
          .filter(Boolean);
      }

      members = [
        ...students.map((s) => ({
          userId: s._id,
          userType: "student",
        })),
        ...teacherIds.map((t) => ({
          userId: t,
          userType: "teacher",
        })),
      ];
    }

    // ─── TEACHER / CUSTOM / BROADCAST GROUP ──────
    // "broadcast" groups (and any other type with an explicit member list)
    // can ALSO carry an `audience` selection — e.g. "all students", "all
    // teachers", "everyone", or scoped to specific classes — which gets
    // merged in below.
    if (["teacher", "custom", "broadcast", "announcement"].includes(type)) {
      members = req.body.members || [];
    }

    // ─── AUDIENCE-BASED BROADCAST MEMBERS ────────
    if (audience) {
      const audienceMembers = await resolveAudienceMembers({
        schoolId,
        audience,
      });
      members = [...members, ...audienceMembers];
    }

    // De-dupe (creator/audience/manual list can overlap)
    const seen = new Set();
    members = members.filter((m) => {
      if (!m?.userId) return false;
      const key = `${m.userId}_${m.userType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Always include creator as admin
    const exists = members.some(
      (m) => m.userId.toString() === userId.toString(),
    );

    if (!exists) {
      members.push({
        userId,
        userType,
        role: "admin",
      });
    }

    const group = await Group.create({
      name,
      type,
      description,
      schoolId,
      classId: classId || null,
      sectionId: sectionId || null,
      subjectId: subjectId || null,
      createdBy: { userId, userType },
      members,
      audience: audience
        ? {
            allUsers: !!audience.allUsers,
            allStudents: !!audience.allStudents,
            allTeachers: !!audience.allTeachers,
            classIds: audience.classIds || [],
          }
        : undefined,
      permissions: groupPermissions,
      isAutoCreated: ["class", "section", "subject"].includes(type),
    });

    res.status(201).json({ success: true, data: group });
  } catch (err) {
    console.error("Create group error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /groups/my-groups
 */
export const getMyGroups = async (req, res) => {
  try {
    const { userId, schoolId } = normalizeUser(req.user);
    const { type, status = "Active" } = req.query;

    if (!schoolId) {
      return res
        .status(403)
        .json({ success: false, message: "School context required" });
    }

    const filter = { schoolId, "members.userId": userId, status };
    if (type) filter.type = type;

    const groups = await Group.find(filter)
      .populate("classId", "name")
      .populate("sectionId", "name")
      .populate("subjectId", "name")
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, data: groups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /groups/school-groups  (admin only)
 */
export const getAllSchoolGroups = async (req, res) => {
  try {
    const { userType, schoolId } = normalizeUser(req.user);

    if (userType !== "admin") {
      return res.status(403).json({ success: false, message: "Admin only" });
    }

    const {
      type,
      classId,
      status = "Active",
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { schoolId, status };
    if (type) filter.type = type;
    if (classId) filter.classId = classId;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));

    const skip = (pageNum - 1) * limitNum;

    const [groups, total] = await Promise.all([
      Group.find(filter)
        .populate("classId", "name")
        .populate("sectionId", "name")
        .populate("subjectId", "name")
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .lean(),
      Group.countDocuments(filter),
    ]);

    res.json({ success: true, data: groups, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /groups/:id
 */
export const getGroupById = async (req, res) => {
  try {
    const { userId, userType, schoolId } = normalizeUser(req.user);

    const group = await Group.findOne({ _id: req.params.id, schoolId })
      .populate("classId", "name")
      .populate("sectionId", "name")
      .populate("subjectId", "name");

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    if (!isMember(group, userId) && userType !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Not a member of this group" });
    }

    res.json({ success: true, data: group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /groups/:id
 * Body: { name?, description?, permissions?, status? }
 */
export const updateGroup = async (req, res) => {
  try {
    const { userId, userType, schoolId } = normalizeUser(req.user);

    const group = await Group.findOne({ _id: req.params.id, schoolId });
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    const memberRecord = group.members.find(
      (m) => m.userId.toString() === userId.toString(),
    );

    if (userType !== "admin" && memberRecord?.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Insufficient permissions" });
    }

    const allowedFields = ["name", "description", "status"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) group[field] = req.body[field];
    });

    if (req.body.permissions !== undefined) {
      const { permissions } = req.body;
      group.permissions = group.permissions || {};

      const validatePermissionArray = (arr, fieldName) => {
        if (!Array.isArray(arr)) {
          return {
            valid: false,
            message: `${fieldName} must be an array`,
          };
        }

        const allowedRoles = ["teacher", "student", "admin", "staff"];
        const invalid = arr.filter((role) => !allowedRoles.includes(role));
        if (invalid.length > 0) {
          return {
            valid: false,
            message: `Invalid ${fieldName}: ${invalid.join(", ")}`,
          };
        }

        return { valid: true, value: [...new Set(arr)] };
      };

      if (permissions.canPost !== undefined) {
        const result = validatePermissionArray(
          permissions.canPost,
          "permissions.canPost",
        );
        if (!result.valid) {
          return res
            .status(400)
            .json({ success: false, message: result.message });
        }
        group.permissions.canPost = result.value;
      }

      if (permissions.canComment !== undefined) {
        const result = validatePermissionArray(
          permissions.canComment,
          "permissions.canComment",
        );
        if (!result.valid) {
          return res
            .status(400)
            .json({ success: false, message: result.message });
        }
        group.permissions.canComment = result.value;
      }
    }

    await group.save();
    res.json({ success: true, data: group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /groups/:id  — archives the group
 * Auth: school_admin only
 */
export const deleteGroup = async (req, res) => {
  try {
    const { userType, schoolId } = normalizeUser(req.user);

    if (userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin only",
      });
    }

    const group = await Group.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // delete all messages of this group
    await Message.deleteMany({
      groupId: group._id,
    });

    // delete group
    await Group.findByIdAndDelete(group._id);

    res.json({
      success: true,
      message: "Group deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ─── Member Management ────────────────────────────────────────────────────────

/**
 * POST /groups/:id/add-members
 * Body: { members: [{ userId, userType }] }
 */
export const addMembers = async (req, res) => {
  try {
    const { userId, userType, schoolId } = normalizeUser(req.user);
    const { members } = req.body;

    const group = await Group.findOne({ _id: req.params.id, schoolId });
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    const memberRecord = group.members.find(
      (m) => m.userId.toString() === userId.toString(),
    );

    if (
      userType !== "admin" &&
      !["admin", "moderator"].includes(memberRecord?.role)
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Insufficient permissions" });
    }

    if (group.isAutoCreated && userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can modify auto-created groups",
      });
    }

    const validMembers = members.filter(
      (m) =>
        m.userId &&
        ["student", "teacher", "admin", "staff"].includes(m.userType),
    );

    const existingIds = new Set(group.members.map((m) => m.userId.toString()));
    const newMembers = validMembers.filter(
      (m) => !existingIds.has(m.userId.toString()),
    );

    group.members.push(
      ...newMembers.map((m) => ({ ...m, joinedAt: new Date() })),
    );
    await group.save();

    res.json({
      success: true,
      message: `${newMembers.length} members added`,
      data: group,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /groups/:id/remove-members
 * Body: { memberIds: [userId] }
 */
export const removeMembers = async (req, res) => {
  try {
    const { userId, userType, schoolId } = normalizeUser(req.user);
    const { memberIds } = req.body;

    const group = await Group.findOne({ _id: req.params.id, schoolId });
    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    const memberRecord = group.members.find(
      (m) => m.userId.toString() === userId.toString(),
    );

    if (
      userType !== "admin" &&
      !["admin", "moderator"].includes(memberRecord?.role)
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Insufficient permissions" });
    }

    if (memberIds.includes(group.createdBy.userId.toString())) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove group creator",
      });
    }

    const removeSet = new Set(memberIds.map(String));

    group.members = group.members.map((m) =>
      removeSet.has(m.userId.toString())
        ? { ...m.toObject(), isManuallyRemoved: true }
        : m,
    );
    await group.save();

    res.json({ success: true, message: "Members removed", data: group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /groups/:id/members/role
 * Body: { userId, role }
 */
export const changeMemberRole = async (req, res) => {
  try {
    const {
      userId: actorId,
      userType: actorType,
      schoolId,
    } = normalizeUser(req.user);
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res
        .status(400)
        .json({ success: false, message: "userId and role are required" });
    }

    const allowedRoles = ["member", "moderator", "admin"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const group = await Group.findOne({ _id: req.params.id, schoolId });
    if (!group)
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });

    const actorRecord = group.members.find(
      (m) => m.userId.toString() === actorId.toString(),
    );
    if (actorType !== "admin" && actorRecord?.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Insufficient permissions" });
    }

    // Prevent changing the group's creator role to non-admin
    const creatorId = group.createdBy?.userId?.toString();
    if (creatorId && creatorId === userId && role !== "admin") {
      return res
        .status(400)
        .json({ success: false, message: "Cannot change group creator role" });
    }

    let changed = false;
    group.members = group.members.map((m) => {
      if (m.userId.toString() === userId.toString()) {
        changed = true;
        return { ...m.toObject(), role };
      }
      return m;
    });

    if (!changed) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found in group" });
    }

    await group.save();
    res.json({ success: true, message: "Member role updated", data: group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};