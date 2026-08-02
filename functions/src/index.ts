import * as admin from "firebase-admin";
import { deleteProject } from "./deleteProject";

admin.initializeApp();

export { deleteProject };
