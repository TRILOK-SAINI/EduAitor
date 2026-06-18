// utils/cloudinaryFile.js
import cloudinary from "../middlewares/cloudinary.js";
import path from "path";

// export const uploadToCloudinary = async (file, folder) => {
//   const originalName = path.parse(file.originalname).name;
//   const timestamp = Date.now();
//   const publicId = `${originalName}-${timestamp}`;

//   // PDFs and other docs → raw, images/videos → auto
//   const isPdf = file.mimetype === "application/pdf";
//   const resourceType = isPdf ? "raw" : "auto";

//   const result = await cloudinary.uploader.upload(
//     `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
//     {
//       folder: `eduaitor/${folder}`,
//       public_id: publicId,
//       resource_type: resourceType,
//     },
//   );

//   return {
//     url: result.secure_url,
//     public_id: result.public_id,
//     type: file.mimetype,
//   };
// };

// utils/cloudinaryFile.js — minimal, backward-compatible change
export const uploadToCloudinary = async (file, folder, resourceTypeOverride = "auto") => {
  const originalName = path.parse(file.originalname).name;
  const timestamp = Date.now();
  const publicId = `${originalName}-${timestamp}`; // NO extension baked in — keep it simple

  const result = await cloudinary.uploader.upload(
    `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
    {
      folder: `eduaitor/${folder}`,
      public_id: publicId,
      resource_type: resourceTypeOverride,
    },
  );

  return {
    url: result.secure_url,
    public_id: result.public_id,
    type: file.mimetype,
  };
};