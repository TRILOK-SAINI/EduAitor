import express from "express";

import {
createSchool,
getSchools,
getSchool,
updateSchool,
deleteSchool
} from "../controllers/schoolController.js";
import upload from "../middlewares/upload.js";
const router = express.Router();

/* ROUTES */

router.post("/",upload.single("school_logo"), createSchool);

router.get("/",getSchools);

router.get("/:id",getSchool);

router.put("/:id",upload.single("school_logo"), updateSchool);

router.delete("/:id",deleteSchool);

export default router;