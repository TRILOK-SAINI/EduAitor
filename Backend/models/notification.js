// import mongoose from 'mongoose';

// const targetSchema = new mongoose.Schema({
//   type: {
//     type: String,
//     enum: ['all', 'role', 'class', 'exam', 'student', 'teacher', 'diary','assignment',"attendance",'gatepass'],
//     default: 'all',
//   },
//   roles:     [{ type: String, enum: ['teacher_admin', 'student_admin', 'school_admin','staff_admin'] }],
//   classId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Class'   },
//   examId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Exam'    },
//   schoolId:  { type: mongoose.Schema.Types.ObjectId, ref: 'School'  },
//   studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
//   teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
//   sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
// }, { _id: false });

// const notificationSchema = new mongoose.Schema({
//   title:    { type: String, required: true },
//   message:  { type: String, required: true },
//   createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

//   targets: [targetSchema],

//   notificationType: {
//     type: String,
//     enum: ['general', 'exam', 'result', 'attendance', 'fee', 'diary', 'assignment','gatepass'],
//     default: 'general',
//   },

//   // User has seen/read this notification (unread badge logic)
//   readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

//   // User dismissed from topbar dropdown only — still visible on Notification Page
//   dismissedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

//   startingDate: Date,
//   endingDate:   Date,
// }, { timestamps: true });

// export default mongoose.model('Notification', notificationSchema);

// models/Notification.js
import mongoose from 'mongoose';

const targetSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['all', 'role', 'class', 'exam', 'student', 'teacher', 'diary', 'assignment', 'attendance', 'gatepass'],
    default: 'all',
  },
  roles:     [{ type: String, enum: ['teacher_admin', 'student_admin', 'school_admin', 'staff_admin'] }],
  classId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Class'   },
  examId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Exam'    },
  schoolId:  { type: mongoose.Schema.Types.ObjectId, ref: 'School'  },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
}, { _id: false });

const attachmentSchema = new mongoose.Schema({
  url:       { type: String, required: true },
  public_id: { type: String, required: true },
  name:      { type: String },             // original filename
  type:      { type: String },             // mimetype e.g. application/pdf
}, { _id: false });

const notificationSchema = new mongoose.Schema({
  title:            { type: String, required: true },
  message:          { type: String, required: true },
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targets:          [targetSchema],
  notificationType: {
    type: String,
    enum: ['general', 'exam', 'result', 'attendance', 'fee', 'diary', 'assignment', 'gatepass'],
    default: 'general',
  },
  attachments:  [attachmentSchema],        // ← multiple PDFs
  readBy:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dismissedBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startingDate: Date,
  edningDate:   Date,
  // scheduling
  status:       { type: String, enum: ['sent', 'scheduled'], default: 'sent' },
  scheduledAt:  Date,                      // when to auto-publish
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);