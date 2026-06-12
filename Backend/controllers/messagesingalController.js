import MessageThread from "../models/messagethread.js";
import DirectMessage  from "../models/directmessage.js";
import Teacher from "../models/teacher.js";
import Student from "../models/student.js";
import Staff from "../models/staff.js";
import School from "../models/school.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

// ─────────────────────────────────────────────────────────────
// HELPER — extract logged-in user info from JWT (req.user)
// Returns { participantId, participantModel, schoolId, name }
// ─────────────────────────────────────────────────────────────
const getCallerInfo = (req) => {
  const { role } = req.user;

  if (role === "teacher_admin") {
    return {
      participantId: req.user.teacher_id,
      participantModel: "Teacher",
      schoolId: req.user.school_id,
    };
  }

  if (role === "student_admin") {
    return {
      participantId: req.user.student_id,
      participantModel: "Student",
      schoolId: req.user.school_id,
    };
  }

  if (role === "staff_admin") {
    return {
      participantId: req.user.staff_id,
      participantModel: "Staff",
      schoolId: req.user.school_id,
    };
  }

  if (role === "school_admin") {
    return {
      participantId: req.user.school_id, // school_admin's ID is the school itself
      participantModel: "School",
      schoolId: req.user.school_id,
    };
  }

  return null; // super_admin not supported in messaging for now
};

// ─────────────────────────────────────────────────────────────
// HELPER — get display name + photo from populated participant
// Handles all 4 models cleanly
// ─────────────────────────────────────────────────────────────
const formatParticipant = (participant) => {
  const doc = participant.participantId; // populated document
  const model = participant.participantModel;

  if (!doc) return null;

  let name = "";
  let photo = null;
  let role = model;

  if (model === "Teacher") {
    name = doc.fullName || "";
    photo = doc.photo?.url || null;
    role = "Teacher";
  }

  if (model === "Student") {
    name = `${doc.firstName || ""} ${doc.lastName || ""}`.trim();
    photo = doc.documents?.studentPhoto?.url || null;
    role = "Student";
  }

  if (model === "Staff") {
    name = doc.fullName || "";
    photo = doc.photo?.url || null;
    role = doc.staffRole || "Staff";
  }

  if (model === "School") {
    name = doc.school_name || "";
    photo = doc.school_logo || null;
    role = "School Admin";
  }

  return {
    _id: doc._id,
    name,
    photo,
    role,
    model,
  };
};

// ─────────────────────────────────────────────────────────────
// @route   POST /api/messages/thread/start
// @desc    Start a new thread or return existing one
// @access  Private
// ─────────────────────────────────────────────────────────────
export const startOrGetThread = async (req, res) => {
  try {
    const caller = getCallerInfo(req);

    // Validate — role must be supported
    if (!caller) {
      return res.status(403).json({
        success: false,
        message: "Your role is not supported for messaging.",
      });
    }

    const { targetId, targetModel } = req.body;

    // Validate — targetId and targetModel are required
    if (!targetId || !targetModel) {
      return res.status(400).json({
        success: false,
        message: "targetId and targetModel are required.",
      });
    }

    // Validate — targetModel must be one of the allowed models
    const allowedModels = ["Teacher", "Student", "Staff", "School"];
    if (!allowedModels.includes(targetModel)) {
      return res.status(400).json({
        success: false,
        message: `targetModel must be one of: ${allowedModels.join(", ")}`,
      });
    }

    // Validate — user cannot message themselves
    if (caller.participantId.toString() === targetId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot message yourself.",
      });
    }

    // Validate — target user actually exists in the correct model
    const modelMap = { Teacher, Student, Staff, School };
    const TargetModel = modelMap[targetModel];
    const targetExists = await TargetModel.findById(targetId).select("_id schoolId");

    if (!targetExists) {
      return res.status(404).json({
        success: false,
        message: `${targetModel} not found.`,
      });
    }

    // School isolation — both must belong to same school
    // School model itself uses _id as schoolId, others have schoolId field
    const targetSchoolId =
      targetModel === "School"
        ? targetExists._id.toString()
        : targetExists.schoolId?.toString();

    if (targetSchoolId !== caller.schoolId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You cannot message users from a different school.",
      });
    }

    // Check if thread already exists between these two participants
    // We match both participant IDs regardless of order
    const existingThread = await MessageThread.findOne({
      schoolId: caller.schoolId,
      "participants.participantId": {
        $all: [caller.participantId, targetId],
      },
    });

    if (existingThread) {
      // Thread already exists — return it
      return res.status(200).json({
        success: true,
        message: "Thread already exists.",
        threadId: existingThread._id,
      });
    }

    // Create new thread
    const newThread = await MessageThread.create({
      schoolId: caller.schoolId,
      participants: [
        {
          participantId: caller.participantId,
          participantModel: caller.participantModel,
          schoolId: caller.schoolId,
        },
        {
          participantId: targetId,
          participantModel: targetModel,
          schoolId: caller.schoolId,
        },
      ],
      lastMessage: "",
      lastMessageAt: null,
    });

    return res.status(201).json({
      success: true,
      message: "Thread created successfully.",
      threadId: newThread._id,
    });
  } catch (error) {
    console.error("❌ startOrGetThread error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────
// @route   GET /api/messages/threads
// @desc    Get all threads (inbox) for logged-in user
// @access  Private
// ─────────────────────────────────────────────────────────────
export const getMyThreads = async (req, res) => {
  try {
    const caller = getCallerInfo(req);

    if (!caller) {
      return res.status(403).json({
        success: false,
        message: "Your role is not supported for messaging.",
      });
    }

    // Fetch all threads where this user is a participant
    // Sort by latest message first
    const threads = await MessageThread.find({
      schoolId: caller.schoolId,
      "participants.participantId": caller.participantId,
    })
      .sort({ lastMessageAt: -1 })
      .populate({
        path: "participants.participantId",
        // Select only fields we need for inbox display
        select: "fullName photo school_name school_logo firstName lastName documents staffRole",
      });

    // For each thread — format the OTHER participant's info
    // and calculate unread count
    const formattedThreads = await Promise.all(
      threads.map(async (thread) => {
        // Find the other participant (not me)
        const otherParticipant = thread.participants.find(
          (p) => p.participantId?._id?.toString() !== caller.participantId.toString()
        );

        const otherUser = otherParticipant
          ? formatParticipant(otherParticipant)
          : null;

        // Count unread messages — messages not sent by me and not seen
        const unreadCount = await DirectMessage.countDocuments({
          threadId: thread._id,
          seen: false,
          senderId: { $ne: caller.participantId },
        });

        return {
          _id: thread._id,
          otherUser,
          lastMessage: thread.lastMessage || "",
          lastMessageAt: thread.lastMessageAt,
          unreadCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      threads: formattedThreads,
    });
  } catch (error) {
    console.error("❌ getMyThreads error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────
// @route   GET /api/messages/thread/:threadId
// @desc    Get all messages in a thread (chat history)
// @access  Private
// ─────────────────────────────────────────────────────────────
export const getThreadMessages = async (req, res) => {
  try {
    const caller = getCallerInfo(req);

    if (!caller) {
      return res.status(403).json({
        success: false,
        message: "Your role is not supported for messaging.",
      });
    }

    const { threadId } = req.params;

    // Validate threadId format
    if (!threadId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid thread ID.",
      });
    }

    // Find thread and verify this user is a participant
    const thread = await MessageThread.findOne({
      _id: threadId,
      schoolId: caller.schoolId,
      "participants.participantId": caller.participantId,
    });

    if (!thread) {
      return res.status(404).json({
        success: false,
        message: "Thread not found or you are not a participant.",
      });
    }

    // Fetch messages oldest to newest
    const messages = await DirectMessage .find({ threadId })
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("❌ getThreadMessages error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────
// @route   POST /api/messages/thread/:threadId/send
// @desc    Send a message (text or image/file)
// @access  Private
// ─────────────────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const caller = getCallerInfo(req);

    if (!caller) {
      return res.status(403).json({
        success: false,
        message: "Your role is not supported for messaging.",
      });
    }

    const { threadId } = req.params;
    const { text } = req.body;
    const file = req.file; // from multer — optional

    // Validate — must have text or attachment
    if (!text?.trim() && !file) {
      return res.status(400).json({
        success: false,
        message: "Message must have text or an attachment.",
      });
    }

    // Validate threadId format
    if (!threadId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid thread ID.",
      });
    }

    // Verify thread exists and user is a participant
    const thread = await MessageThread.findOne({
      _id: threadId,
      schoolId: caller.schoolId,
      "participants.participantId": caller.participantId,
    });

    if (!thread) {
      return res.status(404).json({
        success: false,
        message: "Thread not found or you are not a participant.",
      });
    }

    // Handle attachment upload if file is present
    let attachment = {
      url: null,
      public_id: null,
      type: null,
      name: null,
    };

    if (file) {
      // Upload to cloudinary under messages folder
      const uploaded = await uploadToCloudinary(file, "messages");
      attachment = {
        url: uploaded.url,
        public_id: uploaded.public_id,
        type: uploaded.type,
        name: file.originalname, // save original file name for display
      };
    }

    // Determine senderModel from caller
    const senderModel = caller.participantModel;

    // Create the message
    const newMessage = await DirectMessage .create({
      threadId,
      senderId: caller.participantId,
      senderModel,
      text: text?.trim() || "",
      attachment,
      seen: false,
    });

    // Update thread's last message preview and timestamp
    await MessageThread.findByIdAndUpdate(threadId, {
      lastMessage: text?.trim()
        ? text.trim()
        : `📎 ${file.originalname}`, // show file name if no text
      lastMessageAt: new Date(),
      lastMessageSenderId: caller.participantId,
    });

    return res.status(201).json({
      success: true,
      message: "Message sent.",
      data: newMessage,
    });
  } catch (error) {
    console.error("❌ sendMessage error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────
// @route   PUT /api/messages/thread/:threadId/read
// @desc    Mark all messages in thread as seen
// @access  Private
// ─────────────────────────────────────────────────────────────
export const markThreadAsRead = async (req, res) => {
  try {
    const caller = getCallerInfo(req);

    if (!caller) {
      return res.status(403).json({
        success: false,
        message: "Your role is not supported for messaging.",
      });
    }

    const { threadId } = req.params;

    // Validate threadId format
    if (!threadId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid thread ID.",
      });
    }

    // Verify thread exists and user is a participant
    const thread = await MessageThread.findOne({
      _id: threadId,
      schoolId: caller.schoolId,
      "participants.participantId": caller.participantId,
    });

    if (!thread) {
      return res.status(404).json({
        success: false,
        message: "Thread not found or you are not a participant.",
      });
    }

    // Mark all messages NOT sent by me as seen
    // (no point marking my own messages as seen)
    await DirectMessage.updateMany(
      {
        threadId,
        senderId: { $ne: caller.participantId },
        seen: false,
      },
      { $set: { seen: true } }
    );

    return res.status(200).json({
      success: true,
      message: "Messages marked as read.",
    });
  } catch (error) {
    console.error("❌ markThreadAsRead error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────
// @route   GET /api/messages/users
// @desc    Get list of users for "New Message" page (+ button)
//          Currently returns: Teachers + School Admin
//          Add more roles here later (Staff, Students)
// @access  Private
// ─────────────────────────────────────────────────────────────
export const getUsersForNewMessage = async (req, res) => {
  try {
    const caller = getCallerInfo(req);

    if (!caller) {
      return res.status(403).json({
        success: false,
        message: "Your role is not supported for messaging.",
      });
    }

    const { schoolId } = caller;

    // Search query — optional, for the search bar on new message page
    const search = req.query.search?.trim() || "";
    const searchRegex = new RegExp(search, "i"); // case insensitive

    // ── Fetch Teachers ──────────────────────────────────────
    const teacherQuery = {
      schoolId,
      // Exclude the logged-in user if they are a teacher
      ...(caller.participantModel === "Teacher" && {
        _id: { $ne: caller.participantId },
      }),
      // Apply search on fullName if search query exists
      ...(search && { fullName: searchRegex }),
    };

    const teachers = await Teacher.find(teacherQuery)
      .select("fullName photo designation schoolId")
      .limit(50); // reasonable limit

    // ── Fetch School Admin ──────────────────────────────────
// Use findById — guarantees only THIS school, never another
// Skip entirely if caller is school_admin (can't message themselves)
let schoolAdmins = [];
if (caller.participantModel !== "School") {
  const schoolDoc = await School.findById(schoolId)
    .select("school_name school_logo");

  if (schoolDoc) {
    // Apply search filter manually since we're using findById
    const matchesSearch =
      !search ||
      schoolDoc.school_name?.toLowerCase().includes(search.toLowerCase());

    if (matchesSearch) {
      schoolAdmins = [
        {
          _id: schoolDoc._id,
          name: schoolDoc.school_name,
          photo: schoolDoc.school_logo || null,
          role: "School Admin",
          model: "School",
        },
      ];
    }
  }
}
    // ── Fetch Staff ─────────────────────────────────────────
    const staffQuery = {
      schoolId,
      status: "Active",
      ...(caller.participantModel === "Staff" && {
        _id: { $ne: caller.participantId },
      }),
      ...(search && { fullName: searchRegex }),
    };

    const staffList = await Staff.find(staffQuery)
      .select("fullName photo staffRole staffRoleCustom schoolId")
      .limit(50);

    // ── Format all into unified shape ───────────────────────
    const formattedTeachers = teachers.map((t) => ({
      _id: t._id,
      name: t.fullName,
      photo: t.photo?.url || null,
      role: t.designation || "Teacher",
      model: "Teacher",
    }));

    const formattedSchoolAdmins = schoolAdmins.map((s) => ({
      _id: s._id,
      name: s.school_name,
      photo: s.school_logo || null,
      role: "School Admin",
      model: "School",
    }));

    const formattedStaff = staffList.map((s) => ({
      _id: s._id,
      name: s.fullName,
      photo: s.photo?.url || null,
      role: s.staffRole === "other" ? s.staffRoleCustom : s.staffRole,
      model: "Staff",
    }));

    // ── Combine: School Admin first, then Staff, then Teachers
  const users = [
  ...schoolAdmins,
  ...formattedStaff,
  ...formattedTeachers,
];

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("❌ getUsersForNewMessage error:", error.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};