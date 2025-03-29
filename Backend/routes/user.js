const express = require("express");
const { getInfo, SignUp, Login } = require("../controllers/userfun");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

router.post("/signup", SignUp);
router.post("/login", Login);
router.get("/getInfo", authenticate, getInfo);

module.exports = router;
