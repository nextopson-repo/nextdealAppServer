import express  from "express";
import { uploadLocationDropdown, userRequirements } from "@/api/controllers/dropdown/DropdownController";
import { imageFilter } from "@/api/controllers/dropdown/DropdownController";
import { uploadPropertyDropdown } from "@/api/controllers/dropdown/DropdownController";
const Router = express.Router();

Router.post("/userRequirements",userRequirements);
Router.post("/imagefilter",imageFilter);
Router.post("/uploadpropertydropdown",uploadPropertyDropdown);
Router.post("/location", uploadLocationDropdown);

export default Router;
