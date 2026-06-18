import Group from "../models/group.js";
import Class from "../models/class.js";
import Section from "../models/section.js";
import Student from "../models/student.js";
import Teacher from "../models/teacher.js";

// ADD student to correct groups
export const syncStudentGroups = async (student) => {
  const { _id, schoolId, classId, sectionId } = student;

  // Class group
  const classGroup = await Group.findOne({
    schoolId,
    type: "class",
    classId,
    status: "Active",
  });

  if (classGroup) {
    const existingMember = classGroup.members.find(
      (m) => m.userId.toString() === _id.toString(),
    );

    if (!existingMember) {
      classGroup.members.push({
        userId: _id,
        userType: "student",
      });
      await classGroup.save();
    } else if (existingMember.isManuallyRemoved) {
      existingMember.isManuallyRemoved = false;
      await classGroup.save();
    }
  }

  // Section group
  if (sectionId) {
    const sectionGroup = await Group.findOne({
      schoolId,
      type: "section",
      classId,
      sectionId,
      status: "Active",
    });

    if (sectionGroup) {
      const existingMember = sectionGroup.members.find(
        (m) => m.userId.toString() === _id.toString(),
      );

      if (!existingMember) {
        sectionGroup.members.push({
          userId: _id,
          userType: "student",
        });
        await sectionGroup.save();
      } else if (existingMember.isManuallyRemoved) {
        existingMember.isManuallyRemoved = false;
        await sectionGroup.save();
      }
    }
  }

  // Subject groups
  const subjectGroups = await Group.find({
    schoolId,
    type: "subject",
    classId,
    sectionId,
    status: "Active",
  });

  for (const group of subjectGroups) {
    const existingMember = group.members.find(
      (m) => m.userId.toString() === _id.toString(),
    );

    if (!existingMember) {
      group.members.push({
        userId: _id,
        userType: "student",
      });
      await group.save();
    } else if (existingMember.isManuallyRemoved) {
      existingMember.isManuallyRemoved = false;
      await group.save();
    }
  }
};

// REMOVE student from old groups
export const removeStudentFromOldGroups = async (oldStudent) => {
  const { _id, schoolId } = oldStudent;

  await Group.updateMany(
    {
      schoolId,
      isAutoCreated: true,
      "members.userId": _id,
    },
    {
      $set: {
        "members.$[elem].isManuallyRemoved": true,
      },
    },
    {
      arrayFilters: [{ "elem.userId": _id }],
    },
  );
};

export const syncTeacherGroups = async (teacher) => {
  const { _id, schoolId, assignedClasses = [] } = teacher;

  // ─── CLASS GROUPS ─────────────────────────
  const classGroups = await Group.find({
    schoolId,
    type: "class",
    classId: { $in: assignedClasses },
    status: "Active",
  });

  for (const group of classGroups) {
    const existingMember = group.members.find(
      (m) => m.userId.toString() === _id.toString(),
    );

    if (!existingMember) {
      group.members.push({
        userId: _id,
        userType: "teacher",
      });
      await group.save();
    } else if (existingMember.isManuallyRemoved) {
      existingMember.isManuallyRemoved = false;
      await group.save();
    }
  }

  // ─── SUBJECT GROUPS ───────────────────────
  const subjectGroups = await Group.find({
    schoolId,
    type: "subject",
    status: "Active",
  });

  const classIds = [...new Set(subjectGroups.map((g) => g.classId.toString()))];

  const classes = await Class.find({ _id: { $in: classIds } });

  const classMap = new Map(classes.map((c) => [c._id.toString(), c]));

  for (const group of subjectGroups) {
    const { classId, sectionId, subjectId } = group;

    // get class data
    const classData = classMap.get(classId.toString());
    if (!classData) continue;

    const section = classData.details.find(
      (d) => d.sectionId?.toString() === sectionId?.toString(),
    );

    if (!section) continue;

    const teachesSubject = section.subjectTeachers.some(
      (st) =>
        st.teacherId?.toString() === _id.toString() &&
        st.subjectId?.toString() === subjectId?.toString(),
    );

    if (!teachesSubject) continue;

    const existingMember = group.members.find(
      (m) => m.userId.toString() === _id.toString(),
    );

    if (!existingMember) {
      group.members.push({
        userId: _id,
        userType: "teacher",
      });
      await group.save();
    } else if (existingMember.isManuallyRemoved) {
      existingMember.isManuallyRemoved = false;
      await group.save();
    }
  }
};

export const removeTeacherFromOldGroups = async (oldTeacher) => {
  const { _id, schoolId } = oldTeacher;

  await Group.updateMany(
    {
      schoolId,
      isAutoCreated: true,
      "members.userId": _id,
    },
    {
      $set: {
        "members.$[elem].isManuallyRemoved": true,
      },
    },
    {
      arrayFilters: [{ "elem.userId": _id }],
    },
  );
};

// REMOVE a teacher only from the auto-created groups belonging to ONE class
// (used when a teacher is unassigned from a specific class/section/subject,
// instead of wiping them from every auto group in the school)
export const removeTeacherFromClassGroups = async (teacherId, classId) => {
  if (!teacherId || !classId) return;

  await Group.updateMany(
    {
      classId,
      isAutoCreated: true,
      "members.userId": teacherId,
    },
    {
      $set: {
        "members.$[elem].isManuallyRemoved": true,
      },
    },
    {
      arrayFilters: [{ "elem.userId": teacherId }],
    },
  );
};

// ─── AUTO GROUP CREATION (class add / class update) ──────────────────────────
// Ensures a "class" group exists for the whole class, a "section" group for
// every section under it, and a "subject" group for every subject/teacher
// pairing inside each section. Safe to call repeatedly — it only creates the
// groups that don't already exist, never duplicates them.
export const autoCreateClassGroups = async (classDoc, createdBy) => {
  if (!classDoc) return null;

  const { _id: classId, schoolId, name: className, details = [] } = classDoc;

  const sectionIds = details
    .map((d) => d.sectionId)
    .filter(Boolean)
    .map((id) => id.toString());

  const sections = sectionIds.length
    ? await Section.find({ _id: { $in: sectionIds } }).select("name")
    : [];

  const sectionNameMap = new Map(sections.map((s) => [s._id.toString(), s.name]));

  // ── CLASS GROUP ──
  let classGroup = await Group.findOne({ schoolId, type: "class", classId });
  if (!classGroup) {
    classGroup = await Group.create({
      name: `${className} - Class Group`,
      type: "class",
      schoolId,
      classId,
      createdBy,
      isAutoCreated: true,
      members: [],
    });
  }

  for (const d of details) {
    // ── SECTION GROUP ──
    if (d.sectionId) {
      const sectionGroup = await Group.findOne({
        schoolId,
        type: "section",
        classId,
        sectionId: d.sectionId,
      });

      if (!sectionGroup) {
        const sectionName = sectionNameMap.get(d.sectionId.toString());

        await Group.create({
          name: sectionName
            ? `${className} - ${sectionName} Section Group`
            : `${className} - Section Group`,
          type: "section",
          schoolId,
          classId,
          sectionId: d.sectionId,
          createdBy,
          isAutoCreated: true,
          members: [],
        });
      }
    }
  }

  return classGroup;
};

// ─── FULL MEMBER RESYNC FOR A CLASS ───────────────────────────────────────────
// Re-runs syncStudentGroups / syncTeacherGroups for every student & teacher
// currently tied to a class. Call this right after autoCreateClassGroups so
// newly created groups (and any structural changes from an update) get their
// members populated immediately, instead of waiting for the next individual
// student/teacher save.
export const syncClassGroupsMembers = async (classDoc) => {
  if (!classDoc) return;
  const { _id: classId, schoolId } = classDoc;

  const students = await Student.find({ schoolId, classId });
  for (const student of students) {
    await syncStudentGroups(student);
  }

  const teachers = await Teacher.find({
    schoolId,
    assignedClasses: classId,
  });
  for (const teacher of teachers) {
    await syncTeacherGroups(teacher);
  }
};