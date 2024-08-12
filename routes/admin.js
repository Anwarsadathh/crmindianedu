var express = require('express');
var router = express.Router();
var serviceHelpers = require("../helpers/service-helpers");



router.get("/", (req, res, next) => {
  res.render("user/service", { layout: "admin-layout", admin: true }); // Use admin layout
});

router.get("/view-university", function (req, res, next) {
  serviceHelpers.getAllUniversity().then((university) => {
    console.log(university);

    res.render("admin/view-university", {
      admin: true,
      layout: "admin",
      university,
    });
  });
});


router.get("/view-college", function (req, res, next) {
  serviceHelpers.getAllCollege().then((college) => {
    console.log(college);

    res.render("admin/view-college", { admin: true, layout: "admin", college });
  });
});



module.exports = router;
