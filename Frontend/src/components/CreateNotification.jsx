// import { useState, useEffect } from "react";
// import axios from "axios";
// import { toast } from "react-toastify";

// const TARGET_TYPES = [
//   { value: "all",   label: "🌐 Everyone" },
//   { value: "role",  label: "👥 By Role"  },
//   { value: "class", label: "🏫 By Class" },
// ];

// const ROLES = [
//   { value: "teacher_admin", label: "Teachers"          },
//   { value: "student_admin", label: "Students / Parents" },
//   { value: "school_admin",  label: "School Admins"     },
// ];

// const NOTIF_TYPES = [
//   { value: "general",    label: "📢 General"    },
//   { value: "exam",       label: "📝 Exam"       },
//   { value: "result",     label: "🏆 Result"     },
//   { value: "attendance", label: "📋 Attendance" },
//   { value: "fee",        label: "💰 Fee"        },
// ];

// /* ─── shared class strings ─── */
// const inputCls = [
//   "w-full rounded-xl border px-4 py-3 text-sm outline-none transition",
//   "border-[rgb(var(--border))]",
//   "bg-[rgb(var(--bg))]",
//   "text-[rgb(var(--text))]",
//   "placeholder:text-[rgb(var(--text-muted))]",
//   "focus:border-[rgb(var(--border-strong))]",
//   "focus:ring-2 focus:ring-[rgb(var(--border-strong))]/30",
// ].join(" ");

// const chipBase =
//   "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all";

// const chipActive = [
//   chipBase,
//   "bg-[rgb(var(--primary))]",
//   "text-white",
//   "border-[rgb(var(--primary))]",
//   "shadow-sm",
// ].join(" ");

// const chipIdle = [
//   chipBase,
//   "bg-[rgb(var(--surface))]",
//   "text-[rgb(var(--text-muted))]",
//   "border-[rgb(var(--border))]",
//   "hover:border-[rgb(var(--border-strong))]",
//   "hover:text-[rgb(var(--text))]",
// ].join(" ");

// /* ─── component ─── */
// const CreateNotification = () => {
//   const API = import.meta.env.VITE_API_URL;

//   const [form, setForm] = useState({
//     title: "",
//     message: "",
//     startingDate:"",
//     endingDate:"",
//     notificationType: "general",
//     targetType: "all",
//     selectedRoles: [],
//     classId: "",
//   });

//   const [classes, setClasses] = useState([]);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     axios
//       .get(`${API}/classes/all`, { withCredentials: true })
//       .then((r) => setClasses(r.data.classes))
//       .catch(() => {});
//   }, []);

//   const toggleRole = (role) =>
//     setForm((prev) => ({
//       ...prev,
//       selectedRoles: prev.selectedRoles.includes(role)
//         ? prev.selectedRoles.filter((r) => r !== role)
//         : [...prev.selectedRoles, role],
//     }));

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     let target = { type: form.targetType };
//     if (form.targetType === "role")  target.roles   = form.selectedRoles;
//     if (form.targetType === "class") target.classId = form.classId;

//     try {
//       await axios.post(
//         `${API}/notifications`,
//         {
//           title: form.title,
//           message: form.message,
//           notificationType: form.notificationType,
//           startingDate:form.startingDate,
//           endingDate:form.endingDate,
//           target,
//         },
//         { withCredentials: true },
//       );
//       toast.success("Notification sent!");
//       setForm({
//         title: "", message: "", notificationType: "general",
//         targetType: "all", selectedRoles: [], classId: "", startingDate:"",endingDate:"",
//       });
//     } catch {
//       toast.error("Failed to send notification");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     /* Card */
//     <div
//       className="mx-auto max-w-lg rounded-2xl border p-6 shadow-sm"
//       style={{
//         background: "rgb(var(--surface))",
//         borderColor: "rgb(var(--border))",
//       }}
//     >
//       {/* Header */}
//       <h2 className="text-xl font-bold text-[rgb(var(--text))]">
//         📣 Send Notification
//       </h2>
//       <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
//         Target specific roles, classes, or send to everyone
//       </p>

//       <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">

//         {/* Title */}
//         <input
//           className={inputCls}
//           placeholder="Title  (e.g. Holiday Announcement)"
//           value={form.title}
//           onChange={(e) => setForm({ ...form, title: e.target.value })}
//           required
//         />


//         {/* Message */}
//         <textarea
//           rows={3}
//           className={`${inputCls} resize-none`}
//           placeholder="Write your message here..."
//           value={form.message}
//           onChange={(e) => setForm({ ...form, message: e.target.value })}
//           required
//         />
//         {/* Date*/}
//         <div className="flex flex-col">
//        <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
//            Starting Date
//           </label>
//          <input
//           className={inputCls}
//           type="date"
//           placeholder="starting date"
//           value={form.startingDate}
//           onChange={(e) => setForm({ ...form, startingDate: e.target.value })}
//           required
//           min={
//                       new Date(Date.now()).toISOString().split("T")[0]
//           }
//         />
// <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
//             ending Date
//           </label>
//          <input
//           className={inputCls}
//           type="date"
//           placeholder="ending date"
//           value={form.endingDate}
//           onChange={(e) => setForm({ ...form, endingDate: e.target.value })}
//           required
//         />
// </div>


//         {/* Notification Type */}
//         <div>
//           <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
//             Notification Type
//           </label>
//           <div className="flex flex-wrap gap-2">
//             {NOTIF_TYPES.map((t) => (
//               <button
//                 key={t.value}
//                 type="button"
//                 onClick={() => setForm({ ...form, notificationType: t.value })}
//                 className={
//                   form.notificationType === t.value ? chipActive : chipIdle
//                 }
//               >
//                 {t.label}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Target Type */}
//         <div>
//           <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
//             Send To
//           </label>
//           <div className="flex flex-wrap gap-2">
//             {TARGET_TYPES.map((t) => (
//               <button
//                 key={t.value}
//                 type="button"
//                 onClick={() =>
//                   setForm({
//                     ...form,
//                     targetType: t.value,
//                     selectedRoles: [],
//                     classId: "",
//                   })
//                 }
//                 className={
//                   form.targetType === t.value ? chipActive : chipIdle
//                 }
//               >
//                 {t.label}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Conditional: Role selector */}
//         {form.targetType === "role" && (
//           <div
//             className="rounded-xl border p-3"
//             style={{
//               background: "rgb(var(--bg))",
//               borderColor: "rgb(var(--border))",
//             }}
//           >
//             <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
//               Select Roles
//             </label>
//             <div className="flex flex-wrap gap-3">
//               {ROLES.map((r) => (
//                 <label
//                   key={r.value}
//                   className="flex cursor-pointer items-center gap-2"
//                 >
//                   <input
//                     type="checkbox"
//                     checked={form.selectedRoles.includes(r.value)}
//                     onChange={() => toggleRole(r.value)}
//                     className="accent-[rgb(var(--primary))] h-4 w-4 rounded"
//                   />
//                   <span className="text-xs font-medium text-[rgb(var(--text))]">
//                     {r.label}
//                   </span>
//                 </label>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Conditional: Class selector */}
//         {form.targetType === "class" && (
//           <select
//             className={inputCls}
//             value={form.classId}
//             onChange={(e) => setForm({ ...form, classId: e.target.value })}
//             required
//           >
//             <option value="">— Select Class —</option>
//             {classes.map((c) => (
//               <option key={c._id} value={c._id}>
//                 {c.name} {c.section}
//               </option>
//             ))}
//           </select>
//         )}

//         {/* Submit */}
//         <button
//           type="submit"
//           disabled={loading}
//           className="mt-1 w-full rounded-xl py-3 text-sm font-bold text-white transition
//                      hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
//           style={{ background: "rgb(var(--primary))" }}
//         >
//           {loading ? "Sending…" : "Send Notification"}
//         </button>
//       </form>
//     </div>
//   );
// };

// export default CreateNotification;
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const TARGET_TYPES = [
  { value: "all",   label: "🌐 Everyone" },
  { value: "role",  label: "👥 By Role"  },
  { value: "class", label: "🏫 By Class" },
];

const ROLES = [
  { value: "teacher_admin", label: "Teachers"           },
  { value: "student_admin", label: "Students / Parents" },
  { value: "school_admin",  label: "School Admins"      },
];

const NOTIF_TYPES = [
  { value: "general",    label: "📢 General"    },
  { value: "exam",       label: "📝 Exam"       },
  { value: "result",     label: "🏆 Result"     },
  { value: "attendance", label: "📋 Attendance" },
  { value: "fee",        label: "💰 Fee"        },
];

const inputCls = [
  "w-full rounded-xl border px-4 py-3 text-sm outline-none transition",
  "border-[rgb(var(--border))]",
  "bg-[rgb(var(--bg))]",
  "text-[rgb(var(--text))]",
  "placeholder:text-[rgb(var(--text-muted))]",
  "focus:border-[rgb(var(--border-strong))]",
  "focus:ring-2 focus:ring-[rgb(var(--border-strong))]/30",
].join(" ");

const chipBase   = "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all";
const chipActive = `${chipBase} bg-[rgb(var(--primary))] text-white border-[rgb(var(--primary))] shadow-sm`;
const chipIdle   = `${chipBase} bg-[rgb(var(--surface))] text-[rgb(var(--text-muted))] border-[rgb(var(--border))] hover:border-[rgb(var(--border-strong))] hover:text-[rgb(var(--text))]`;

const SEND_MODES = [
  { value: "now",       label: "⚡ Send Now"       },
  { value: "scheduled", label: "🕐 Schedule Later" },
];

const CreateNotification = () => {
  const API     = import.meta.env.VITE_API_URL;
  const fileRef = useRef();

  const [form, setForm] = useState({
    title:            "",
    message:          "",
    startingDate:     "",
    notificationType: "general",
    targetType:       "all",
    selectedRoles:    [],
    classId:          "",
    sendMode:         "now",      // "now" | "scheduled" | "draft"
    scheduledAt:      "",         // datetime-local value
  });

  const [pdfs,    setPdfs]    = useState([]);   // File[] selected by user
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/classes/all`, { withCredentials: true })
      .then((r) => setClasses(r.data.classes))
      .catch(() => {});
  }, []);

  const toggleRole = (role) =>
    setForm((prev) => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(role)
        ? prev.selectedRoles.filter((r) => r !== role)
        : [...prev.selectedRoles, role],
    }));

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const pdfsOnly = files.filter((f) => f.type === "application/pdf");
    if (pdfsOnly.length !== files.length) toast.warn("Only PDF files are allowed");
    setPdfs((prev) => {
      const combined = [...prev, ...pdfsOnly];
      if (combined.length > 5) {
        toast.warn("Maximum 5 PDFs allowed");
        return combined.slice(0, 5);
      }
      return combined;
    });
    // reset input so same file can be re-added after removal
    e.target.value = "";
  };

  const removePdf = (index) =>
    setPdfs((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.sendMode === "scheduled" && !form.scheduledAt) {
      toast.error("Please pick a date & time to schedule");
      return;
    }

    setLoading(true);

    // build FormData — needed for file upload
    const fd = new FormData();
    fd.append("title",            form.title);
    fd.append("message",          form.message);
    fd.append("notificationType", form.notificationType);
    fd.append("startingDate",     form.startingDate);

    if (form.sendMode === "scheduled") {
      fd.append("scheduledAt", new Date(form.scheduledAt).toISOString());
    }
    let target = { type: form.targetType };
    if (form.targetType === "role")  target.roles   = form.selectedRoles;
    if (form.targetType === "class") target.classId = form.classId;
    fd.append("target", JSON.stringify(target));

    pdfs.forEach((file) => fd.append("pdfs", file));

    try {
      const { data } = await axios.post(`${API}/notifications`, fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(data.message);

      // reset
      setForm({
        title: "", message: "", startingDate: "",
        notificationType: "general", targetType: "all",
        selectedRoles: [], classId: "",
        sendMode: "now", scheduledAt: "",
      });
      setPdfs([]);
    } catch {
      toast.error("Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  // min datetime for schedule picker = now + 5 min
  const minSchedule = new Date(Date.now() + 5 * 60 * 1000)
    .toISOString().slice(0, 16);

  return (
    <div className="mx-auto max-w-lg rounded-2xl border p-6 shadow-sm
      bg-[rgb(var(--surface))] border-[rgb(var(--border))]">

      <h2 className="text-xl font-bold text-[rgb(var(--text))]">📣 Send Notification</h2>
      <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
        Target specific roles, classes, or send to everyone
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">

        {/* Title */}
        <input
          className={inputCls}
          placeholder="Title (e.g. Holiday Announcement)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />

        {/* Message */}
        <textarea
          rows={3}
          className={`${inputCls} resize-none`}
          placeholder="Write your message here..."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
        />

        {/* Starting Date */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
            Event Date
          </label>
          <input
            className={inputCls}
            type="date"
            value={form.startingDate}
            onChange={(e) => setForm({ ...form, startingDate: e.target.value })}
            min={new Date().toISOString().split("T")[0]}
          />
        </div>

        {/* PDF Upload */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
            Attach PDFs <span className="font-normal">(max 5, 10 MB each)</span>
          </label>

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current.click()}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border-2
              border-dashed border-[rgb(var(--border))] py-5 cursor-pointer
              hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--bg))] transition"
          >
            <span className="text-2xl">📄</span>
            <p className="text-xs text-[rgb(var(--text-muted))]">
              Click to browse PDFs
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Selected PDF list */}
          {pdfs.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {pdfs.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg border
                    border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2"
                >
                  <span className="text-xs text-[rgb(var(--text))] truncate max-w-[80%]">
                    📄 {f.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePdf(i)}
                    className="text-rose-500 text-xs font-bold ml-2 hover:text-rose-700"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Notification Type */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
            Notification Type
          </label>
          <div className="flex flex-wrap gap-2">
            {NOTIF_TYPES.map((t) => (
              <button key={t.value} type="button"
                onClick={() => setForm({ ...form, notificationType: t.value })}
                className={form.notificationType === t.value ? chipActive : chipIdle}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Send To */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
            Send To
          </label>
          <div className="flex flex-wrap gap-2">
            {TARGET_TYPES.map((t) => (
              <button key={t.value} type="button"
                onClick={() => setForm({ ...form, targetType: t.value, selectedRoles: [], classId: "" })}
                className={form.targetType === t.value ? chipActive : chipIdle}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Role selector */}
        {form.targetType === "role" && (
          <div className="rounded-xl border p-3 bg-[rgb(var(--bg))] border-[rgb(var(--border))]">
            <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
              Select Roles
            </label>
            <div className="flex flex-wrap gap-3">
              {ROLES.map((r) => (
                <label key={r.value} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.selectedRoles.includes(r.value)}
                    onChange={() => toggleRole(r.value)}
                    className="accent-[rgb(var(--primary))] h-4 w-4 rounded"
                  />
                  <span className="text-xs font-medium text-[rgb(var(--text))]">{r.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Class selector */}
        {form.targetType === "class" && (
          <select
            className={inputCls}
            value={form.classId}
            onChange={(e) => setForm({ ...form, classId: e.target.value })}
            required
          >
            <option value="">— Select Class —</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>{c.name} {c.section}</option>
            ))}
          </select>
        )}

        {/* Send Mode */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
            When to Send
          </label>
          <div className="flex flex-wrap gap-2">
            {SEND_MODES.map((m) => (
              <button key={m.value} type="button"
                onClick={() => setForm({ ...form, sendMode: m.value, scheduledAt: "" })}
                className={form.sendMode === m.value ? chipActive : chipIdle}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule picker — only when scheduled */}
        {form.sendMode === "scheduled" && (
          <div>
            <label className="mb-2 block text-xs font-semibold text-[rgb(var(--text-muted))]">
              Schedule Date & Time
            </label>
            <input
              className={inputCls}
              type="datetime-local"
              value={form.scheduledAt}
              min={minSchedule}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              required
            />
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="mt-1 w-full rounded-xl py-3 text-sm font-bold text-white transition
            bg-[rgb(var(--primary))] hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "Sending…" : (
            form.sendMode === "scheduled" ? "⏰ Schedule Notification" :
            form.sendMode === "draft"     ? "💾 Save Draft" :
                                            "📣 Send Now"
          )}
        </button>

      </form>
    </div>
  );
};

export default CreateNotification;