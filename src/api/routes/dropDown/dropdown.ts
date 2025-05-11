import express  from "express";
import { uploadLocationDropdown, userRequirements, getStates, getCities, getLocalities } from "@/api/controllers/dropdown/DropdownController";
import { imageFilter } from "@/api/controllers/dropdown/DropdownController";
import { uploadPropertyDropdown } from "@/api/controllers/dropdown/DropdownController";
const Router = express.Router();

Router.post("/userRequirements",userRequirements);
Router.post("/imagefilter",imageFilter);
Router.post("/uploadpropertydropdown",uploadPropertyDropdown);
Router.post("/location", uploadLocationDropdown);

// New hierarchical location routes
Router.get("/states", getStates);
Router.post("/cities", getCities);
Router.post("/localities", getLocalities);

export default Router;
