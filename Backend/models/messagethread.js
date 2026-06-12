import mongoose from "mongoose";

// Allowed participant model names — add more roles here later
const PARTICIPANT_MODELS = ["Teacher", "Student", "Staff", "School"];

const participantSchema = new mongoose.Schema(
  {
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "participants.participantModel", // dynamic populate
    },
    participantModel: {
      type: String,
      required: true,
      enum: PARTICIPANT_MODELS,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
  },
  { _id: false }
);

const messageThreadSchema = new mongoose.Schema(
  {
    participants: {
      type: [participantSchema],
      validate: {
        validator: (arr) => arr.length === 2,
        message: "A thread must have exactly 2 participants",
      },
    },

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    lastMessage: {
      type: String,
      default: "",
    },

    lastMessageAt: {
      type: Date,
      default: null,
    },

    // which participantId sent the last message — for unread logic
    lastMessageSenderId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate threads between same 2 users
// We sort participant IDs before saving (enforced in controller)
messageThreadSchema.index({ schoolId: 1, "participants.participantId": 1 });

const MessageThread =
  mongoose.models.MessageThread ||
  mongoose.model("MessageThread", messageThreadSchema);

export default MessageThread;