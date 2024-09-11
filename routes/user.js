const express = require("express");
const router = express.Router();
const serviceHelpers = require("../helpers/service-helpers");
const updateDatabase = require("../utils/update-database");
const { ObjectId } = require("mongodb");
const multer = require("multer"); // Import multer
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bodyParser = require("body-parser");
const { log } = require("console");
const collection = require("../config/collection");
const db = require("../config/connection");
// const checkFollowUps = require("../utils/followUpChecker"); // Import the follow-up checker
const bcrypt = require("bcrypt");
const saltRounds = 10; // Define saltRounds


// // Call the function periodically (e.g., every minute)
// setInterval(checkFollowUps, 10000);


// Configure the transporter
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "clientsupport@indianeduhub.com",
    pass: "xeep ypij nhqg ilcd",
  },
});



router.post('/send-emailclient', (req, res) => {
    const { email, message } = req.body;

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "clientsupport@indianeduhub.com",
        pass: "xeep ypij nhqg ilcd",
      },
    });

    const mailOptions = {
        from: 'clientsupport@indianeduhub.com',
        to: email,
        subject: 'Message from Client Department',
        text: message
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({ success: false, error });
        } else {
            return res.status(200).json({ success: true, info });
        }
    });
});

// Function to generate OTP
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

let otpStore = {}; // In-memory store for demonstration purposes

// // Route to send OTP
// router.post("/send-otp", async (req, res) => {
//   const { email } = req.body;

//   // Generate OTP (for demo purposes, use a real OTP generation logic in production)
//   const otp = Math.floor(100000 + Math.random() * 900000);

//   otpStore[email] = otp;

//   // Send OTP via email (using nodemailer or another service)
//   // Example setup for nodemailer (configure with real credentials)
//   let transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: "clientsupport@indianeduhub.com",
//       pass: "xeep ypij nhqg ilcd",
//     },
//   });

//   let mailOptions = {
//     from: "clientsupport@indianeduhub.com",
//     to: email,
//     subject: "Your OTP Code",
//     text: `Your OTP code is ${otp}`,
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     res.json({ success: true });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Failed to send OTP" });
//   }
// });
router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  try {
    const result = await serviceHelpers.sendOtp(email, otpStore);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error: " + error.message,
      });
  }
});
router.post("/send-otppartner", async (req, res) => {
  const { email } = req.body;

  try {
    const result = await serviceHelpers.sendOtpPatner(email, otpStore);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error: " + error.message,
    });
  }
});
// Route to verify OTP
router.post("/verify-otp", (req, res) => {
  const { otp, email } = req.body;

  if (otpStore[email] && otpStore[email] == otp) {
    delete otpStore[email]; // Remove OTP after verification
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, message: "Invalid OTP" });
  }
});


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/"); // Ensure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({ storage });

require("dotenv").config();

function verifyLoginStudent(req, res, next) {
  if (req.session && req.session.student) {
    next();
  } else {
    res.redirect("/students-login");
  }
}

// Middleware for verifying lead owner login
function verifyLogins(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
}

// Middleware for verifying lead owner login
function verifyLogin(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect("/lead-login");
  }
}

// Middleware for verifying super admin login
function verifySuper(req, res, next) {
  if (req.session && req.session.super) {
    next();
  } else {
    res.redirect("/super-admin");
  }
}

function verifyPartner(req, res, next) {
  if (req.session && req.session.partner) {
    next();
  } else {
    console.log("Partner session not found. Redirecting to sign-up."); // Debug log
    res.redirect("/partner-signup");
  }
}

function verifyAffiliate(req, res, next) {
  if (req.session && req.session.affiliate) {
    next();
  } else {
    console.log("Partner session not found. Redirecting to sign-up."); // Debug log
    res.redirect("/affiliate-partner-signup");
  }
}



router.get("/partner-logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    res.redirect("/partner-signup"); // Redirect to signup or login page
  });
});


router.post("/update-database", async (req, res) => {
  try {
    await updateDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating database:", error);
    res.json({ success: false });
  }
});



router.get("/", (req, res) => {
  const {
    Referral = "",
    utm_source = "",
    utm_medium = "",
    utm_campaign = "",
    utm_content = "",
    utm_id = "",
    utm_term = "",
  } = req.query;
  res.render("user/all-links", {
    user: true,
    Referral,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_id,
    utm_term,
  });
});

router.get("/login", (req, res) => {
  res.render("user/logins", { user: true });
});

router.get("/end-to-end-membership", (req, res) => {
  res.render("user/end-to-end", { user: true });
});

router.get("/accounts", (req, res) => {
  res.render("user/accounts-login", { user: true });
});

router.get("/crm-tl-dashboard", async (req, res) => {
  const { leadOwnerEmail, startDate, endDate } = req.query;

  // Fetch all lead owners
  const leadOwners = await serviceHelpers.getAllLeadOwners();

  // Use the selected leadOwnerEmail from the query, or null for all lead owners
  const sessionEmail = leadOwnerEmail || null;

  try {
    const {
      mainStageCounts,
      stageCounts,
      subStageCounts,
      totalLeads,
      documents, // Ensure documents are included here
    } = await serviceHelpers.getLeadStatusCountsok(
      sessionEmail,
      startDate,
      endDate
    );

    // Render the dashboard with the calculated counts
    res.render("user/crm-tl-dashboard", {
      user: true,
      totalLeads,
      leadOwners,
      selectedLeadOwner: sessionEmail || "", // Pass the selected lead owner or empty string
      mainStageCounts,
      stageCounts,
      subStageCounts,
      documents, // Ensure this is passed to the template
    });
  } catch (error) {
    console.error("Error fetching lead status counts:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});


router.get("/crm-tl-details", async (req, res) => {
  try {
    const { leadOwnerEmail, startDate, endDate, state, city, course } =
      req.query;
    const leadStage = await serviceHelpers.getAllLeadStage();

    // Remove duplicate mainStage entries
    const uniqueLeadStages = Array.from(
      new Set(leadStage.map((stage) => stage.mainStage))
    ).map((mainStage) => {
      return leadStage.find((stage) => stage.mainStage === mainStage);
    });

    let matchCriteria = {};
    if (leadOwnerEmail) matchCriteria.leadOwnerName = leadOwnerEmail;
    if (state) matchCriteria.state = state;
    if (city) matchCriteria.city = city;
    if (course) matchCriteria.course = course;
    if (startDate && endDate) {
      matchCriteria.assignDate = { $gte: startDate, $lte: endDate };
    }

    // Fetch data from both collections based on match criteria
    const googlesheets = await serviceHelpers.getAllGooglsheets(matchCriteria);
    const referrals = await serviceHelpers.getAllReferral(matchCriteria);

    // Handle missing source values
    const filteredGooglesheets = googlesheets.map((item) => ({
      ...item,
      source: item.source || "N/A",
    }));
    const referralsWithSource = referrals.map((item) => ({
      ...item,
      source: item.source || "N/A",
    }));

    // Combine data
    const combinedData = [...filteredGooglesheets, ...referralsWithSource];

    // Filter out leads that have assignLead set to "assigned"
    const filteredCombinedData = combinedData.filter(
      (item) => item.assignLead !== "assigned"
    );

    // Fetch lead owners
    const leadOwners = await serviceHelpers.getAllLeadOwners();

    // Render the view with the filtered combined data
    res.render("user/crm-tl-details", {
      admin: true,
      googlesheets: filteredCombinedData,
      leadOwners,
      leadStage: uniqueLeadStages,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.get("/crm-tl-assigned", async (req, res) => {
  try {
    const { leadOwnerEmail, startDate, endDate, state, city, course } =
      req.query;
    const leadStage = await serviceHelpers.getAllLeadStage();

    // Remove duplicate mainStage entries
    const uniqueLeadStages = Array.from(
      new Set(leadStage.map((stage) => stage.mainStage))
    ).map((mainStage) => {
      return leadStage.find((stage) => stage.mainStage === mainStage);
    });

    let matchCriteria = {};
    if (leadOwnerEmail) matchCriteria.leadOwnerName = leadOwnerEmail;
    if (state) matchCriteria.state = state;
    if (city) matchCriteria.city = city;
    if (course) matchCriteria.course = course;
    if (startDate && endDate) {
      matchCriteria.assignDate = { $gte: startDate, $lte: endDate };
    }

    // Fetch data from both collections based on match criteria
    const googlesheets = await serviceHelpers.getAllGooglsheets(matchCriteria);
    const referrals = await serviceHelpers.getAllReferral(matchCriteria);

    // Handle missing source values
    const filteredGooglesheets = googlesheets.map((item) => ({
      ...item,
      source: item.source || "N/A",
    }));
    const referralsWithSource = referrals.map((item) => ({
      ...item,
      source: item.source || "N/A",
    }));

    // Combine data
    const combinedData = [...filteredGooglesheets, ...referralsWithSource];

    // Filter out data without the "assignLead" field or where "assignLead" is not "assigned"
    const filteredCombinedData = combinedData.filter(
      (item) => item.assignLead === "assigned"
    );

    // Fetch lead owners
    const leadOwners = await serviceHelpers.getAllLeadOwners();

    // Render the view with the filtered data
    res.render("user/crm-tl-assigned", {
      admin: true,
      googlesheets: filteredCombinedData,
      leadOwners,
      leadStage: uniqueLeadStages,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});




// router.get("/crm-lead-rewards", (req, res) => {
//   serviceHelpers.getAllReferral().then((referral) => {
//     // Exclude the first item from the array

//     serviceHelpers.getAllLeadOwners().then((leadOwners) => {
//       console.log(leadOwners);
//       // Log the filtered data to the console (for debugging purposes)

//       // Render the view with the filtered data
//       res.render("user/crmleadowner-rewards", {
//         admin: true,
//         referral,
//         leadOwners,
//       });
//     });
//   });
// });


router.get("/crm-tl-referral", (req, res) => {
  serviceHelpers.getAllReferral().then((referral) => {
    // Exclude the first item from the array

    serviceHelpers.getAllLeadOwners().then((leadOwners) => {
      console.log(leadOwners);
      // Log the filtered data to the console (for debugging purposes)

      // Render the view with the filtered data
      res.render("user/crm-tl-referral-ldo", {
        admin: true,
        referral,
        leadOwners,
      });
    });
  });
});

router.post("/crm-tl-referral", async (req, res) => {
  try {
    const { title, amount, leadOwner } = req.body;

    // Validate the data
    if (!title || !amount || !leadOwner) {
      throw new Error("All fields are required");
    }

    // Prepare the referral data without leadOwner field
    const referralData = {
      title,
      amount,
    };

    // Update the lead owner with the new referral data
    await serviceHelpers.updateLeadOwnerref(leadOwner, referralData);

    // Redirect or respond with success
    res.redirect("/crm-tl-referral");
  } catch (error) {
    console.error("Error updating referral:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/crm-tl-referral-scratch", async (req, res) => {
  try {
    const { title, scratch } = req.body;
    const leadOwner = req.session.user.email; // Assuming the logged-in user's email is stored in the session

    // Validate the data
    if (!title || !scratch) {
      throw new Error("Title and scratch fields are required");
    }

    // Prepare the referral data
    const referralData = {
      title,
      scratch, // Include the new field in the referral data
    };

    // Update the lead owner with the new referral data
    await serviceHelpers.updateLeadOwnerrefSc(leadOwner, referralData);

    // Respond with success
    res.send("Referral scratch status updated successfully");
  } catch (error) {
    console.error("Error updating referral:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post("/update-lead-owner", async (req, res) => {
  const { leads, leadOwnerName, assignLead, leadStatus, assignDate } = req.body;

  try {
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      console.error("No leads provided or invalid format.");
      return res
        .status(400)
        .json({
          success: false,
          message: "No leads provided or invalid format.",
        });
    }

    const leadStatusObject =
      leadStatus && typeof leadStatus === "object" ? leadStatus : {};

    // Perform the update for each lead
    for (const lead of leads) {
      const { id, source } = lead;
      if (!id || typeof id !== "string") {
        console.error("Invalid ID format:", id);
        continue;
      }

      await serviceHelpers.updateLeadOwner(
        id,
        leadOwnerName,
        assignLead,
        leadStatusObject,
        assignDate
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating lead owners:", error);
    res.json({
      success: false,
      message: "An error occurred while updating the lead owners.",
    });
  }
});







router.post("/update-lead-status", async (req, res) => {
  const { id, leadStatusUpdate } = req.body;
  const { mainStage, leadStage, statusObj } = leadStatusUpdate;

  try {
    if (!id || typeof id !== "string") {
      console.error("Invalid ID format:", id);
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID format." });
    }

    // Update lead status using the helper function
    await serviceHelpers.updateLeadStatus(id, mainStage, leadStage, statusObj);

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating lead status:", error);
    res.json({
      success: false,
      message: "An error occurred while updating the lead status.",
    });
  }
});



router.post("/get-sub-stage-mandatory", async (req, res) => {
  const { stage, subStage } = req.body;

  const result = await serviceHelpers.getSubStageMandatoryStatus(stage, subStage);

  if (result.success) {
    res.json(result);
  } else {
    res.status(404).json(result);
  }
});


router.post("/get-lead-status", async (req, res) => {
  const { id, leadStage } = req.body;

  try {
    // Log the incoming request body for debugging
    console.log("Incoming request:", { id, leadStage });

    if (!id || typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID format." });
    }

    // Fetch lead status
    const leadStatus = await serviceHelpers.getLeadStatus(id, leadStage);

    // Log the result before sending the response
    console.log("Lead status fetched:", leadStatus);

    res.json({ success: true, leadStatus });
  } catch (error) {
    console.error("Error fetching lead status:", error);
    res.json({
      success: false,
      message: "An error occurred while fetching the lead status.",
    });
  }
});










router.get("/crm-create-lead", (req, res) => {
   serviceHelpers.getAllLeadOwners().then((leadOwners) => {
     console.log(leadOwners);

     res.render("user/crm-create-lead", { user: true, leadOwners });
   });
 
});

router.get("/se-form", (req, res) => {
  res.render("user/form", { user: true });
});

router.get("/lead-login", (req, res) => {
  res.render("user/leadlogin", { user: true });
});

router.get("/crm-lead-owner-dashboard-details", (req, res) => {
  res.render("user/crm-tp-dashboard-details", { user: true });
});






router.get("/crm-lead-owner-dashboard", verifyLogin, async (req, res) => {
  const sessionEmail = req.session.user.email;
  const { startDate, endDate, filterType, stage, showLatestSubstage } =
    req.query;

  try {
    // Modify the backend function to include documents
   const {
     mainStageCounts,
     stageCounts,
     subStageCounts,
     totalLeads,
     documents, // Ensure documents are included here
   } = await serviceHelpers.getLeadStatusCounts(
     sessionEmail,
     startDate,
     endDate,
     filterType,
     stage,
     showLatestSubstage === "true"
   );




      res.render("user/crmleadowners-dash", {
        user: true,
        totalLeads,
        stage,
        mainStageCounts,
        stageCounts,
        subStageCounts,
        showLatestSubstage: showLatestSubstage === "true",
        userEmail: req.session.user.email,
        userName: req.session.user.name,
        documents, // Ensure this is passed to the template
      });

  } catch (error) {
    console.error("Error fetching lead status counts:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});


router.get("/lead-details", verifyLogin, async (req, res) => {
  const { id } = req.query;

  console.log("Received ID:", id);

  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid Lead ID" });
  }a

  try {
    const data = await serviceHelpers.getLeadDetailsById(id);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching lead details:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// router.get("/crm-lead-owner-dashboard", verifyLogin, async (req, res) => {
//   const sessionEmail = req.session.user.email;
//   const { startDate, endDate, filterType, stage, showLatestSubstage } =
//     req.query;

//   try {
//     // Log the incoming request details
//     console.log("Request received with the following parameters:");
//     console.log("Session Email:", sessionEmail);
//     console.log("Start Date:", startDate);
//     console.log("End Date:", endDate);
//     console.log("Filter Type:", filterType);
//     console.log("Stage:", stage);
//     console.log("Show Latest Substage:", showLatestSubstage);

//     // Call the helper function to fetch the lead status counts
//     const results = await serviceHelpers.getLeadStatusCounts(
//       sessionEmail,
//       startDate,
//       endDate,
//       filterType,
//       stage,
//       showLatestSubstage
//     );

//     // Log the results from the helper function
//     console.log(
//       "Lead Status Counts Results:",
//       JSON.stringify(results, null, 2)
//     );

//     // Render the HBS template with the fetched data
//     res.render("user/crmleadowners-dash", {
//       user: true,
//       data: results, // Pass the results to the template
//     });
//   } catch (error) {
//     // Log the error if something goes wrong
//     console.error("Error fetching lead status counts:", error);
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// });

// router.post("/filter-leads", async (req, res) => {
//   const { startDate, endDate } = req.body;
//   const sessionEmail = req.session.user.email; // Get the session email

//   try {
//     // Fetch filtered lead status counts and total leads
//     const { combinedCounts, totalLeads } = await serviceHelpers.getFilteredLeadCounts(
//       sessionEmail,
//       startDate,
//       endDate
//     );

//     // Send the filtered data back to the frontend
//     res.json({ combinedCounts, totalLeads });
//   } catch (error) {
//     console.error("Error filtering leads:", error);
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// });



router.get("/crm-lead-owner-details", async (req, res) => {
  // Check if the user is logged in
  if (!req.session.user) {
    return res.redirect("/lead-login");
  }

  try {
    // Fetch all lead stages
    const leadStage = await serviceHelpers.getAllLeadStage();
const leadStages = await serviceHelpers.getAllLeadStage();
    // Remove duplicate mainStage entries
    const uniqueLeadStages = Array.from(
      new Set(leadStage.map((stage) => stage.mainStage))
    ).map((mainStage) => {
      return leadStage.find((stage) => stage.mainStage === mainStage);
    });

    // Fetch lead owner name from session
    const leadOwnerName = req.session.user.email;

    // Fetch data from both collections
    const [googlesheets, referrals, leadOwners] = await Promise.all([
      serviceHelpers.getAllGooglsheets(),
      serviceHelpers.getAllReferral(),
      serviceHelpers.getAllLeadOwners(),
    ]);

    // Combine data from both collections
    const combinedData = [...googlesheets, ...referrals];

    // Filter the combined data based on the leadOwnerName and assignLead
    const filteredData = combinedData.filter(
      (item) => item.leadOwnerName === leadOwnerName && item.assignLead !== null
    );

    // Sort the filtered data by assignDate in descending order (latest date first)
    const sortedData = filteredData.sort((a, b) => {
      const dateA = new Date(a.assignDate);
      const dateB = new Date(b.assignDate);
      return dateB - dateA; // Descending order: latest date first
    });

    // Log the sorted data to verify the order
    sortedData.forEach((item, index) => {
      console.log(`Sorted Data Item ${index + 1}:`, item.assignDate);
    });

    // Render the view with the sorted data and session user details
    res.render("user/crmleadowners-details", {
      admin: true,
      googlesheets: sortedData, // Use the sorted data
      leadOwners,
      leadStage: uniqueLeadStages, // Use the unique stages
      userEmail: req.session.user.email,
      userName: req.session.user.name,
      leadStages,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});






router.post("/get-sub-stages", async (req, res) => {
  const { stage, mainStage } = req.body;

  try {
    if (!stage || typeof stage !== "string" || !mainStage || typeof mainStage !== "string") {
      return res.status(400).json({ success: false, message: "Invalid stage or main stage value." });
    }

    const subStages = await serviceHelpers.getSubStagesFromDatabase(stage, mainStage);
    res.json({ success: true, subStages });
  } catch (error) {
    console.error("Error fetching sub-stages:", error);
    res.json({ success: false, message: "An error occurred while fetching sub-stages." });
  }
});

router.post("/get-stages", async (req, res) => {
  const { mainStage } = req.body;

  try {
    if (!mainStage || typeof mainStage !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid main stage value." });
    }

    const stages = await serviceHelpers.getStagesFromDatabase(mainStage);
    res.json({ success: true, stages });
  } catch (error) {
    console.error("Error fetching stages:", error);
    res.json({
      success: false,
      message: "An error occurred while fetching stages.",
    });
  }
});


router.get("/crm-lead-owner-rewards", async (req, res) => {
  // Check if the user is logged in
  if (!req.session.user) {
    return res.redirect("/lead-login");
  }

  const leadOwnerEmail = req.session.user.email;

  try {
    // Fetch the lead owner by email and include rewards
    const leadOwner = await serviceHelpers.getLeadOwnerByEmail(leadOwnerEmail);

    if (!leadOwner) {
      return res.status(404).json({ success: false, message: "Lead owner not found" });
    }

    // Render the view with the lead owner's data and rewards
    res.render("user/crmleadowner-rewards", {
      admin: true,
      leadOwner,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});




// Lead owner login route
router.post("/leadlogin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const leadOwner = await serviceHelpers.authenticateLeadOwner(email, password);
    req.session.user = leadOwner;
    res.redirect("/crm-lead-owner-dashboard");
  } catch (error) {
    console.error("Error during login:", error);
    res.render("user/leadlogin", { error: error.message });
  }
});

router.get("/client-dashboard", (req, res) => {
  res.render("user/client-dashboard", { user: true });
});

router.get("/student-dashboard", verifyLoginStudent, (req, res) => {
  res.render("user/student-dash", { student: req.session.student });
});

router.get("/student-wallet", verifyLoginStudent, (req, res) => {
  res.render("user/wallet", { student: req.session.student });
});

router.get("/student-academicstatus", verifyLoginStudent, (req, res) => {
  res.render("user/student-academicstatus", { student: req.session.student });
});


router.get("/sample-report", (req, res) => {
  res.render("user/br", );
});

router.get("/partner-dashboard", verifyPartner, async (req, res) => {
  try {
    const instituteid = req.session.partner.instituteid;
    console.log("Institute ID from session:", instituteid);

    const referredByCount = await serviceHelpers.getUniqueReferredByCount(
      instituteid
    );

    console.log("ReferredBy Count from Helper:", referredByCount);

    // Render the dashboard with the count
    res.render("user/partner-dashboard", {
      partner: req.session.partner,
      referredByCount: referredByCount,
    });
  } catch (error) {
    console.error("Error fetching ReferredBy count:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post("/submit-form-sug", async (req, res) => {
  const formData = req.body;

  // Add the current timestamp to the form data
  // Get current time in IST
  const currentISTTime = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });

  // Add the current IST timestamp to the form data
  formData.timeStamp = currentISTTime; // Adds the current date and time in ISO format

  try {
    console.log("Received Form Data:", formData);

    const result = await serviceHelpers.submitFormDataSug(formData);

    console.log("Submission Result:", result);

    if (result.success) {
      res.status(200).json(result);
    } else {
      console.error("Submission Failed:", result.message);
      res.status(400).json(result); // Use 400 for client errors like validation issues
    }
  } catch (error) {
    console.error("Error processing form submission:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error: " + error.message });
  }
});



// Route to render the referral form with student details
router.get('/p-referral', async (req, res) => {
  try {
    const studentId = req.query.studentid;
    const utm_source = req.query.utm_source || "";
    const utm_medium = req.query.utm_medium || "";
    const utm_campaign = req.query.utm_campaign || "";
    const utm_content = req.query.utm_content || "";
    const utm_id = req.query.utm_id || "";
    const utm_term = req.query.utm_term || "";

    // Fetch student details using the studentId from the query
    const student = await serviceHelpers.getStudentById(studentId);

    // Render the referral form with student details or empty data, along with UTM parameters
    res.render('user/student-referral-form', {
      student,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_id,
      utm_term
    });
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get("/partner-referral-details", verifyPartner, (req, res) => {
  const instituteid = req.session.partner.instituteid; // Get the instituteid from session

  serviceHelpers
    .getAllPatnerReferral(instituteid)
    .then((referral) => {
      res.render("user/partner-referral-details", {
        admin: true,
        referral,
        partner: req.session.partner,
      });
    })
    .catch((error) => {
      console.error("Error fetching referral details:", error);
      res
        .status(500)
        .send("An error occurred while fetching referral details.");
    });
});




// Route to render the referral form with student details
router.get('/s-referral', async (req, res) => {
  const studentId = req.query.studentid;

  // Regular expression to match the expected student ID format
  const validIdPattern = /^(IEH\d+|SAMPLE007)$/;
  
  if (!studentId || !validIdPattern.test(studentId)) {
    return res.status(400).send('Invalid or missing Student ID');
  }

  try {
    // Fetch student details by ID
    const result = await serviceHelpers.getStudentById(studentId);

    // Default student object if not found
    const student = result.student || {
      name: '',
      course: '',
      specialization: '',
      email: '',
      mobile: '',
      studentid: studentId // Keep the student ID for the form
    };

    // Render the referral form with student details or empty data
    res.render('user/student-referral-form', { student });
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).send('Internal Server Error');
  }
});




router.get("/student-referral-details",verifyLoginStudent, (req, res) => {
  const studentid = req.session.student.studentid; // Get the studentid from session

  serviceHelpers
    .getAllStudentRef(studentid)
    .then((referral) => {
      console.log(referral);

      res.render("user/student-referral-details", {
        admin: true,
        referral,
      });
    })
    .catch((error) => {
      console.error("Error fetching client details:", error);
      res.status(500).send("An error occurred while fetching client details.");
    });
});


router.get("/accounts-dashboard", (req, res) => {
  res.render("user/accounts-dashboard", { user: true });
});

router.get("/accounts-details", async (req, res) => {
  try {
    // Fetch all account dashboard data
    const formData = await serviceHelpers.getAllAccountsdashboard();

    // Fetch all payments data
    const payments = await serviceHelpers.getAllPayments();

    // Fetch partners data
    const partner = await serviceHelpers.getAllPartners();
    const afpartner = await serviceHelpers.getAllAFPartners();

    // Combine partner and afpartner arrays
    const combinedPartners = [...partner, ...afpartner];

    // Render the template with formData, payments, and combined partners
    res.render("user/accounts-details", {
      admin: true,
      formData,
      payments,
      combinedPartners,
      partner,
    });
  } catch (error) {
    console.error("Error fetching account details:", error);
    res.status(500).send("An error occurred while fetching account details.");
  }
});

router.post("/update-accounts-details", async (req, res) => {
  console.log("Request Body:", req.body);

  try {
    const updates = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No data provided" });
    }

    const updateResults = await Promise.all(
      updates.map(async (update) => {
        const {
          _id,
          studyStatus,
          totalAMt,
          totalAMtDate,
          totalExpectedAMt,
          totalExpectedAMtDate,
          paymentDetails,
          semesterStatus,
        } = update;

        if (!_id) {
          return { success: false, message: "Account ID is required" };
        }

        try {
          const existingClient = await db
            .get()
            .collection(collection.CLIENT_COLLECTION)
            .findOne({ _id: ObjectId(_id) });

          if (!existingClient) {
            return { success: false, message: "Client not found" };
          }

          let mergedPaymentDetails = existingClient.paymentDetails || {};

          if (paymentDetails && typeof paymentDetails === "object") {
            for (const stage in paymentDetails) {
              if (paymentDetails.hasOwnProperty(stage)) {
                mergedPaymentDetails[stage] = paymentDetails[stage]; // Overwrite or add new stage details
              }
            }
          }

          const updateFields = {
            studyStatus,
            finalStatus: semesterStatus,
            totalAMt,
            totalAMtDate,
            totalExpectedAMt,
            totalExpectedAMtDate,
            paymentDetails: mergedPaymentDetails, // Save the merged payment details
          };

          const result = await db
            .get()
            .collection(collection.CLIENT_COLLECTION)
            .updateOne({ _id: ObjectId(_id) }, { $set: updateFields });

          if (result.matchedCount === 0) {
            return { success: false, message: "Client not found" };
          }

          return {
            success: true,
            message: "Client details updated successfully",
          };
        } catch (error) {
          console.error("Error updating client details:", error);
          return { success: false, message: "Error updating client details" };
        }
      })
    );

    res.status(200).json(updateResults);
  } catch (error) {
    console.error("Error processing updates:", error);
    res.status(500).json({
      success: false,
      message: "Error processing updates",
      error: error.message,
    });
  }
});






router.get("/find-supers/:referredBy", async (req, res) => {
  const { referredBy } = req.params;

  try {
    const supers = await serviceHelpers.getAllSuper();

    // Find institute based on instituteid or instituteidP
    const institute = supers.find(
      (supers) =>
        supers.instituteid === referredBy || supers.instituteidP === referredBy
    );

    if (institute) {
      // Calculate total wallet amounts for instituteid and instituteidP
      const totalWalletAmount = institute.wallet
        ? institute.wallet.reduce(
            (sum, transaction) => sum + transaction.amount,
            0
          )
        : 0;

      const totalWalletAmountP = institute.walletP
        ? institute.walletP.reduce(
            (sum, transaction) => sum + transaction.amount,
            0
          )
        : 0;

      res.json({
        ...institute,
        totalWalletAmount,
        totalWalletAmountP,
      });
    } else {
      res.status(404).json({ message: "Institute not found" });
    }
  } catch (error) {
    console.error("Error finding institute:", error);
    res.status(500).json({
      message: "An error occurred while finding the institute.",
    });
  }
});






router.get("/find-institute/:referredBy", async (req, res) => {
  const { referredBy } = req.params;

  try {
    const partners = await serviceHelpers.getAllPartners();
    const afpartners = await serviceHelpers.getAllAFPartners();

    const combinedPartners = [...partners, ...afpartners];

    const institute = combinedPartners.find(
      (partner) => partner.instituteid === referredBy
    );

    if (institute) {
      // Calculate total wallet amount
      const totalWalletAmount = institute.wallet
        ? institute.wallet.reduce(
            (sum, transaction) => sum + transaction.amount,
            0
          )
        : 0;

      // Send the institute details along with the total wallet amount
      res.json({
        ...institute,
        totalWalletAmount,
      });
    } else {
      res.status(404).json({ message: "Institute not found" });
    }
  } catch (error) {
    console.error("Error finding institute:", error);
    res.status(500).json({
      message: "An error occurred while finding the institute.",
    });
  }
});


router.post("/add-to-wallet/:instituteId", async (req, res) => {
  const { instituteId } = req.params;
  const { amount, student } = req.body;

  try {
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount." });
    }

    const walletEntry = {
      date: new Date().toISOString(),
      amount: parseFloat(amount),
      studentDetails: {
        studentid: student.studentid,
        name: student.name,
        course: student.course,
        email: student.email,
        mobile: student.mobile,
        state: student.state,
        submissionDate: student.date,
      },
    };

    // Check and update the wallet in partners collection
    const partnersUpdateResult = await serviceHelpers.updateWalletInPartners(
      instituteId,
      walletEntry
    );
    if (partnersUpdateResult.matchedCount > 0) {
      return res.json({
        success: true,
        message: "Wallet updated in partners collection",
      });
    }

    // Check and update the wallet in affiliate partners collection
    const afpartnersUpdateResult =
      await serviceHelpers.updateWalletInAFPartners(instituteId, walletEntry);
    if (afpartnersUpdateResult.matchedCount > 0) {
      return res.json({
        success: true,
        message: "Wallet updated in affiliate partners collection",
      });
    }

    return res
      .status(404)
      .json({ message: "Institute not found in either collection." });
  } catch (error) {
    console.error("Error adding to wallet:", error);
    res
      .status(500)
      .json({ message: "An error occurred while adding to the wallet." });
  }
});


router.post("/add-to-wallet-super/:instituteId", async (req, res) => {
  const { instituteId } = req.params;
  const { amount, student } = req.body;

  try {
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount." });
    }

    const walletEntry = {
      date: new Date().toISOString(),
      amount: parseFloat(amount),
      studentDetails: {
        studentid: student.studentid,
        name: student.name,
        course: student.course,
        email: student.email,
        mobile: student.mobile,
        state: student.state,
        submissionDate: student.date,
      },
    };

    const result = await serviceHelpers.updateWalletInSuper(
      instituteId,
      walletEntry
    );
    console.log("Update result:", result);

    if (result.modifiedCount > 0) {
      // Fetch the updated institute to get new wallet totals
      const supers = await serviceHelpers.getAllSuper();
      const institute = supers.find(
        (supers) =>
          supers.instituteid === instituteId ||
          supers.instituteidP === instituteId
      );

      // Calculate new total wallet amounts
      const totalWalletAmount = institute.wallet
        ? institute.wallet.reduce(
            (sum, transaction) => sum + transaction.amount,
            0
          )
        : 0;

      const totalWalletAmountP = institute.walletP
        ? institute.walletP.reduce(
            (sum, transaction) => sum + transaction.amount,
            0
          )
        : 0;

      return res.json({
        success: true,
        message: "Wallet updated successfully in SUPER_COLLECTION.",
        totalWalletAmount,
        totalWalletAmountP,
      });
    }

    return res
      .status(404)
      .json({ message: "Institute not found in SUPER_COLLECTION." });
  } catch (error) {
    console.error("Error adding to wallet:", error);
    res
      .status(500)
      .json({ message: "An error occurred while adding to the wallet." });
  }
});










router.get("/create-partnerid", (req, res) => {
  res.render("user/create-partnerid", { user: true });
});


router.get("/client-details", (req, res) => {
  serviceHelpers
    .getAllClientdashboard()
    .then((formData) => {
      console.log(formData);

      res.render("user/client-details", {
        admin: true,
        formData,
      });
    })
    .catch((error) => {
      console.error("Error fetching client details:", error);
      res.status(500).send("An error occurred while fetching client details.");
    });
});


router.get("/mentor-form-details", (req, res) => {
 serviceHelpers.getAllClient().then((formData) => {
    console.log(formData);

    res.render("user/mentor-details", {
      admin: true,
      formData,
    });
  });
});



router.post("/se-form", async (req, res) => {
  try {
    serviceHelpers.addClient(req.body, (id, error) => {
      if (error) {
        if (error === "Mobile number or email already exists") {
          console.log("Duplicate detected:", error);
          res.status(400).json({ success: false, message: error });
        } else {
          res
            .status(500)
            .json({
              success: false,
              message: `Failed to insert client: ${error}`,
            });
        }
      } else if (id) {
        console.log("Form Data:", req.body);
        res.status(200).json({ success: true });
      } else {
        res
          .status(500)
          .json({ success: false, message: "Failed to insert client" });
      }
    });
  } catch (error) {
    console.error("Error handling form submission:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/se-form-temp", (req, res) => {
  res.render("user/formst", { user: true });
});

router.post("/se-form-temp", async (req, res) => {
  try {
    serviceHelpers.addClienttemp(req.body, (id, error) => {
      if (error) {
        if (error === "Mobile number or email already exists") {
          console.log("Duplicate detected:", error);
          res.status(400).json({ success: false, message: error });
        } else {
          res.status(500).json({
            success: false,
            message: `Failed to insert client: ${error}`,
          });
        }
      } else if (id) {
        console.log("Form Data:", req.body);
        res.status(200).json({ success: true });
      } else {
        res
          .status(500)
          .json({ success: false, message: "Failed to insert client" });
      }
    });
  } catch (error) {
    console.error("Error handling form submission:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


router.get("/create-payments", async (req, res) => {
  try {
    const payments = await serviceHelpers.getAllPayments();
    res.render("user/create-payments", { user: true, payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ message: "Error fetching payments" });
  }
});


router.post("/create-payments", async (req, res) => {
  try {
    await serviceHelpers.createPayments(req.body.payments);
    res.json({ success: true });
  } catch (error) {
    console.error("Error creating payments:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});



router.get("/get-payment/:id", async (req, res) => {
  try {
    const payment = await serviceHelpers.getPaymentById(req.params.id);
    if (payment) {
      res.setHeader("Cache-Control", "no-store"); // Disable caching
      res.json({ success: true, payment });
    } else {
      res.status(404).json({ success: false, message: "Payment not found" });
    }
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/payments", async (req, res) => {
  try {
    const payments = await serviceHelpers.getAllPayments();
    res.json({ success: true, payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/delete-payment/:id", async (req, res) => {
  try {
    await serviceHelpers.deletePayment(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/edit-payment/:id", async (req, res) => {
  try {
    const updatedData = req.body.payments; // Ensure you're sending the correct data structure
    await serviceHelpers.editPayment(req.params.id, updatedData);
    res.json({ success: true });
  } catch (error) {
    console.error("Error editing payment:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// Handle form submission to create a new lead owner
router.post("/crm-create-lead", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    await serviceHelpers.createLeadOwner({ name, email, password });
    res.json({ success: true });
  } catch (error) {
    console.error("Error creating lead owner:", error);
    res.json({ success: false, message: error.message || "An error occurred while creating the lead owner." });
  }
});

router.get("/crm-leadstage", (req, res) => {
  serviceHelpers.getAllLeadStage().then((leadStage) => {
    console.log(leadStage);

    res.render("user/crm-tl-leadstage", { user: true, leadStage });
  });
});
router.get("/crm-leadstage/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const leadStage = await serviceHelpers.getLeadStageById(id);
    res.json(leadStage);
  } catch (error) {
    console.error("Error fetching lead stage:", error);
    res.status(500).json({ message: "Error fetching lead stage" });
  }
});

router.delete('/crm-leadstage/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await serviceHelpers.deleteLeadStage(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting lead stage:', error);
        res.json({ success: false, message: error.message || 'An error occurred while deleting the lead stage.' });
    }
});

router.put('/crm-leadstage/:id', async (req, res) => {
  const { id } = req.params;
  const { stage, substage } = req.body;

  try {
    await serviceHelpers.updateLeadStage(id, { stage, substage });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating lead stage:', error);
    res.json({ success: false, message: error.message || 'An error occurred while updating the lead stage.' });
  }
});


router.post("/crm-leadstage", async (req, res) => {
  const { mainStage, stage, substage } = req.body;

  try {
    await serviceHelpers.createLeadStage({ mainStage, stage, substage });
    res.json({ success: true });
  } catch (error) {
    console.error("Error creating lead stage:", error);
    res.json({
      success: false,
      message:
        error.message || "An error occurred while creating the lead stage.",
    });
  }
});



router.get("/mentor-dashboard", async function (req, res, next) {
  try {
    // Fetch all client data
    const formData = await serviceHelpers.getAllClient();

    // Initialize counts
    let todayNoStudent = 0;
    let totalNoAssignToClientDepartment = 0;
    let totalNoMentorshipDone = 0;
    let totalIdApproved = 0;
    const uniqueStudentIds = new Set(); // To track unique student IDs

    // Get today's date for comparison
    const today = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD

    // Calculate counts and collect unique student IDs
    formData.forEach((client) => {
      if (client.date === today) {
        todayNoStudent++;
      }
      if (client.assign === "client") {
        totalNoAssignToClientDepartment++;
      }
      if (client.mentorshipStatus === "Done") {
        totalNoMentorshipDone++;
      }
      if (client.idApproved === "Approved") {
        totalIdApproved++;
      }
      if (client.studentid) {
        uniqueStudentIds.add(client.studentid); // Add student ID to the set
      }
    });

    // Calculate the total number of unique student IDs
    const totalUniqueStudentIds = uniqueStudentIds.size;

    // Render the dashboard with calculated counts
    res.render("user/mentor-dashboard", {
      admin: true,
      formData,
      todayNoStudent,
      totalNoAssignToClientDepartment,
      totalNoMentorshipDone,
      totalIdApproved,
      totalUniqueStudentIds, // Pass the total unique student IDs to the frontend
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    next(error);
  }
});




router.post("/update-client-details", async (req, res) => {
  try {
    console.log("Received data:", req.body);

    const {
      id,
      date,
      name,
      course,
      specialization,
      email,
      mobile,
      role,
      specificName,
      servicePack,
      intake,
      university,
      semesterStatus,
      mentorshipStatus,
      universityPaid,
      universityPaidDate,
      documentStatus,
      dateOfRefundInitiateduni,
      dateOfRefundInitiatedieh,
      batch,
      enrollmentNo,
      idApproved,
      mentor,
      assign,
      studentid,
      feepaid,
      feePaidAmount,
      dateOfRefundInitiated,
      unirefundinitiated,
      iehrefundinitiated,
      assignaccounts,
      scholarship,
      password, // New password field
      state,
      city,
      initialRegistration,
      initialDate,
      applicationNo,
      degreeType,
      docApprovedDate,
    } = req.body;

    // Build the updateFields object with only the provided fields
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (scholarship !== undefined) updateFields.scholarship = scholarship;
      if (applicationNo !== undefined)
        updateFields.applicationNo = applicationNo;
     if (degreeType !== undefined) updateFields.degreeType = degreeType;
    if (initialDate !== undefined) updateFields.initialDate = initialDate;
    if (state !== undefined) updateFields.state = state;
    if (city !== undefined) updateFields.city = city;
    if (course !== undefined) updateFields.course = course;
    if (docApprovedDate !== undefined)
      updateFields.docApprovedDate = docApprovedDate;
    if (unirefundinitiated !== undefined)
      updateFields.unirefundinitiated = unirefundinitiated;
    if (iehrefundinitiated !== undefined)
      updateFields.iehrefundinitiated = iehrefundinitiated;
    if (specialization !== undefined)
      updateFields.specialization = specialization;
    if (email !== undefined) updateFields.email = email;
    if (mobile !== undefined) updateFields.mobile = mobile;
    if (role !== undefined) updateFields.role = role;
    if (specificName !== undefined) updateFields.specificName = specificName;
    if (dateOfRefundInitiated !== undefined)
      updateFields.dateOfRefundInitiated = dateOfRefundInitiated;
    if (servicePack !== undefined) updateFields.servicePack = servicePack;
    if (intake !== undefined) updateFields.intake = intake;
    if (dateOfRefundInitiatedieh !== undefined)
      updateFields.dateOfRefundInitiatedieh = dateOfRefundInitiatedieh;
    if (dateOfRefundInitiateduni !== undefined)
      updateFields.dateOfRefundInitiateduni = dateOfRefundInitiateduni;
    if (university !== undefined) updateFields.university = university;
    if (semesterStatus !== undefined)
      updateFields.semesterStatus = semesterStatus;
    if (mentorshipStatus !== undefined)
      updateFields.mentorshipStatus = mentorshipStatus;
    if (universityPaid !== undefined)
      updateFields.universityPaid = universityPaid;
    if (universityPaidDate !== undefined)
      updateFields.universityPaidDate = universityPaidDate;
    if (documentStatus !== undefined)
      updateFields.documentStatus = documentStatus;
    if (dateOfRefundInitiated !== undefined)
      updateFields.dateOfRefundInitiated = dateOfRefundInitiated;
    if (batch !== undefined) updateFields.batch = batch;
    if (enrollmentNo !== undefined) updateFields.enrollmentNo = enrollmentNo;
    if (idApproved !== undefined) updateFields.idApproved = idApproved;
    if (mentor !== undefined) updateFields.mentor = mentor;
    if (date !== undefined) updateFields.date = date;
    if (studentid !== undefined) updateFields.studentid = studentid;
    if (feepaid !== undefined) updateFields.feepaid = feepaid;
    if (feePaidAmount !== undefined) updateFields.feePaidAmount = feePaidAmount;
    if (assign !== undefined)
      updateFields.assign = assign === "null" ? null : assign;
    if (assignaccounts !== undefined)
      updateFields.assignaccounts =
        assignaccounts === "null" ? null : assignaccounts;
    if (password !== undefined) updateFields.password = password;
    if (initialRegistration !== undefined)
      updateFields.initialRegistration =
        initialRegistration === "null" ? null : initialRegistration;
    // Ensure the id is provided and valid
    if (!id) {
      return res.status(400).json({ message: "Client ID is required" });
    }
    const result = await serviceHelpers.updateClientDetails(id, updateFields);

    // Send an email if the ID is approved
    if (idApproved === "Approved" && password) {
      const transporter = nodemailer.createTransport({
        service: "gmail", // or your email service provider
        auth: {
          user: "clientsupport@indianeduhub.com",
          pass: "xeep ypij nhqg ilcd",
        },
      });

   const mailOptions = {
     from: "clientsupport@indianeduhub.com",
     to: email,
     subject: "Your ID Approval and Login Details",
     html: `
    <p>Dear ${name},</p>
    <p>Your ID has been approved. Below are your login details:</p>
    <table style="border-collapse: collapse; width: 100%;">
      <tr>
        <th style="border: 1px solid #dddddd; text-align: left; padding: 8px;">Email</th>
        <td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">${email}</td>
      </tr>
      <tr>
        <th style="border: 1px solid #dddddd; text-align: left; padding: 8px;">Password</th>
        <td style="border: 1px solid #dddddd; text-align: left; padding: 8px;">${password}</td>
      </tr>
    </table>
    <p>You can log in using the following link:</p>
    <p><a href="https://crm.indianeduhub.in/students-login" style="color: #007bff;">https://crm.indianeduhub.in/students-login</a></p>
    <p>Please keep this information secure.</p>
    <p>Best regards,<br>IndianEduHub</p>
  `,
   };


      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("Error sending email:", error);
        } else {
          console.log("Email sent:", info.response);
        }
      });
    }

    // Send a success response with the result
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Super Admin Dashboard route
router.get("/super-admin-dashboard", verifySuper, (req, res) => {
  res.render("user/super-dashboard", { user: true });
});

// // Super Admin Sign-Up Route
// router.get("/super-admin-signup", (req, res) => {
//   res.render("user/super", { user: true });
// });

// router.post("/super-admin-signup", async (req, res) => {
//   const { name, email, password } = req.body;

//   try {
//     const result = await serviceHelpers.signUpSuperAdmin(
//       name,
//       email,
//       password
//     );

//     if (!result.success) {
//       return res.render("user/super-admin-signup", {
//         user: true,
//         error: result.message,
//       });
//     }

//     res.redirect("/super-admin");
//   } catch (err) {
//     console.error(err);
//     res.status(500).render("user/super-admin-signup", {
//       user: true,
//       error: "Internal server error. Please try again.",
//     });
//   }
// });


// Super Admin Login Route
router.get("/super-admin", (req, res) => {
  res.render("user/super-admin", { user: true });
});

router.post("/super-admin", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate the Super Admin login using the helper
    const loginResult = await serviceHelpers.validateSuperAdminLogin(email, password);
    
    if (!loginResult.success) {
      return res.render("user/super-admin", {
        user: true,
        error: loginResult.message,
      });
    }

    // Create session for the Super Admin
    await serviceHelpers.createSuperAdminSession(req, email);

    // Redirect to the dashboard after successful login
    res.redirect("/super-admin-dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).render("user/super-admin", {
      user: true,
      error: "Internal server error. Please try again.",
    });
  }
});


router.get("/students-login", (req, res) => {
  res.render("user/studentslogin", { user: true });
}); 

   
router.post("/studentslogin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const student = await serviceHelpers.authenticateStudents(email, password);
    req.session.student = student;
    console.log(student);

    res.redirect("/student-dashboard");
  } catch (error) {
    console.error("Error during login:", error);
    res.render("user/studentslogin", { error: error.message });
  }
});

// Route to handle profile photo upload
router.post('/upload-profile-photo', upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`; // URL for accessing the uploaded image

    // Update the student's profile with the new image URL
    const result = await serviceHelpers.uploadProfilePhoto(
      req.session.student.email,
      imageUrl
    );

    if (result.success) {
      // Update the session with the new profile photo URL
      req.session.student.profilePhoto = imageUrl;

      res.status(200).json({ success: true, message: 'Profile photo updated successfully', imageUrl });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update profile photo' });
    }
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Route to handle profile photo upload
router.post('/upload-profile-photos', upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`; // URL for accessing the uploaded image

    // Update the student's profile with the new image URL
    const result = await serviceHelpers.uploadProfilePhotos(
      req.session.partner.email,
      imageUrl
    );

    if (result.success) {
      // Update the session with the new profile photo URL
     req.session.partner.profilePhoto = imageUrl;

      res.status(200).json({ success: true, message: 'Profile photo updated successfully', imageUrl });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update profile photo' });
    }
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Route to handle profile photo upload
router.post('/upload-profile-photos-af', upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`; // URL for accessing the uploaded image

    // Update the student's profile with the new image URL
    const result = await serviceHelpers.uploadAfProfilePhotos(
      req.session.affiliate.email,
      imageUrl
    );

    if (result.success) {
      // Update the session with the new profile photo URL
     req.session.affiliate.profilePhoto = imageUrl;

      res.status(200).json({ success: true, message: 'Profile photo updated successfully', imageUrl });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update profile photo' });
    }
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const validEmail = process.env.ADMIN_EMAIL;
  const validPassword = process.env.ADMIN_PASSWORD;

  if (email === validEmail && password === validPassword) {
    req.session.user = email;
    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
      res.redirect("/");
    });
  } else {
    res.render("user/logins", {
      user: true,
      error: "Invalid email or password",
    });
  }
});

router.post("/accountslogin", (req, res) => {
  const { email, password } = req.body;
  const validEmail = process.env.ADMINACCOUNTS_EMAIL;
  const validPassword = process.env.ADMINACCOUNTS_PASSWORD;

  if (email === validEmail && password === validPassword) {
    req.session.user = email;
    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
      res.redirect("/");
    });
  } else {
    res.render("user/accounts-login", {
      user: true,
      error: "Invalid email or password",
    });
  }
});


router.get("/partner-login", (req, res) => {
  res.render("user/partner-login", { user: true });
});

router.post("/partner-login", (req, res) => {
  const { email, password } = req.body;
  const validEmail = process.env.ADMINPARTNER_EMAIL;
  const validPassword = process.env.ADMINPARTNER_PASSWORD;

  if (email === validEmail && password === validPassword) {
    req.session.user = email;
    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
      res.redirect("/partner-creation");
    });
  } else {
    res.render("user/partner-login", {
      user: true,
      error: "Invalid email or password",
    });
  }
});

// Signup route
router.get("/partner-signup", (req, res) => {
  const { name, instituteid } = req.query;
  res.render("user/partner-signup", {
    user: true,
    name: name || "",
    instituteid: instituteid || "",
  });
});


router.post("/partner-signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await serviceHelpers.authenticatePartners(email, password);

    if (result.success) {
      // Store partner information in the session
     req.session.partner = {
       id: result.partner._id,
       email: result.partner.email,
       institutename: result.partner.institutename,
       state: result.partner.state,
       city: result.partner.city,
       instituteid: result.partner.instituteid,
       owner_name: result.partner.owner_name,
       account_holder_name: result.partner.account_holder_name,
       account_number: result.partner.account_number,
       ifsc_code: result.partner.ifsc_code,
       branch: result.partner.branch,
       profilePhoto: result.partner.profilePhoto || "/images/anon.webp", // Default image if not set
     };

      res.status(200).json({
        success: true,
        message: result.message,
        partner: req.session.partner, // Return the session-stored partner info if needed
      });
    } else {
      res.status(401).json(result); // 401 for unauthorized access
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error: " + error.message,
    });
  }
});


// Signup route
router.get("/affiliate-partner-signup", (req, res) => {
  res.render("user/affiliate-signup", {
    user: true,
  });
});


router.post("/affiliate-partner-signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await serviceHelpers.authenticateAfPartners(email, password);

    if (result.success) {
      // Store partner information in the session
      req.session.affiliate = {
        id: result.partner._id,
        name: result.partner.name,
        email: result.partner.email,
        mobile_number: result.partner.mobile_number,
        working_status: result.partner.working_status,
        position: result.partner.position,
        present_company: result.partner.present_company,
        state: result.partner.state,
        city: result.partner.city,
        password: result.partner.password, // Ensure the password is hashed if storing in session (usually not recommended)
        instituteid: result.partner.instituteid,
        profilePhoto: result.partner.profilePhoto || "/images/anon.webp", // Default image if not set
      };

      res.status(200).json({
        success: true,
        message: result.message,
        affiliate: req.session.affiliate, // Return the session-stored partner info if needed
      });
    } else {
      res.status(401).json(result); // 401 for unauthorized access
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error: " + error.message,
    });
  }
});


router.post("/affiliate-partner-creation", async (req, res) => {
  try {
    console.log(req.body); // Log the request body to debug

    const { email, otp, ...otherFields } = req.body;

    // Direct OTP verification not needed here; it should be handled in /verify-otp

    // Proceed with partner creation
    const result = await serviceHelpers.createAfPartner({
      email,
      ...otherFields,
    });

    if (result.success) {
      res.status(200).json({ success: true });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error: " + error.message });
  }
});




router.get("/affiliate-partner-dashboard", verifyAffiliate, async (req, res) => {
  try {
    const instituteid = req.session.affiliate.instituteid;
    console.log("Institute ID from session:", instituteid);

    const referredByCount = await serviceHelpers.getUniqueReferredByCount(
      instituteid
    );

    console.log("ReferredBy Count from Helper:", referredByCount);

    // Render the dashboard with the count
    res.render("user/affiliate-partner-dashboard", {
      affiliate: req.session.affiliate,
      referredByCount: referredByCount,
    });
  } catch (error) {
    console.error("Error fetching ReferredBy count:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/affiliate-partner-wallet", verifyAffiliate, (req, res) => {
  res.render("user/affiliate-partner-wallet", { user: true,affiliate: req.session.affiliate });
});

// Route handler
router.get("/affiliate-partner-client-status", verifyAffiliate, (req, res) => {
  const instituteid = req.session.affiliate.instituteid; // Get the instituteid from session

  serviceHelpers
    .getAllPatnerTrack(instituteid)
    .then((referredBy) => {
      res.render("user/affiliate-partner-client-status", {
        admin: true,
        referredBy, // Pass the filtered referredBy data to the view
        affiliate: req.session.affiliate,
      });
    })
    .catch((error) => {
      console.error("Error fetching referral details:", error);
      res
        .status(500)
        .send("An error occurred while fetching referral details.");
    });
});



router.get("/affiliate-partner-payout-track", verifyAffiliate, (req, res) => {
  res.render("user/affiliate-partner-payout-track", { user: true,affiliate: req.session.affiliate });
});

router.get("/affiliate-partner-referral-details", verifyAffiliate, (req, res) => {
  const instituteid = req.session.affiliate.instituteid; // Get the instituteid from session

  serviceHelpers
    .getAllPatnerTrack(instituteid)
    .then((referral) => {
      res.render("user/affiliate-partner-referral-details", {
        admin: true,
        referral,
        affiliate: req.session.affiliate,
      });
    })
    .catch((error) => {
      console.error("Error fetching referral details:", error);
      res
        .status(500)
        .send("An error occurred while fetching referral details.");
    });
});

router.get("/partner-wallet", verifyPartner, (req, res) => {
  res.render("user/partner-wallet", { user: true,partner: req.session.partner });
});

router.get("/partner-client-status", verifyPartner, (req, res) => {
  const instituteid = req.session.partner.instituteid; // Get the instituteid from session

  serviceHelpers
    .getAllPatnerTrack(instituteid)
    .then((referredBy) => {
      res.render("user/partner-client-status", {
        admin: true,
        referredBy, // Pass the filtered referredBy data to the view
        partner: req.session.partner,
      });
    })
    .catch((error) => {
      console.error("Error fetching referral details:", error);
      res
        .status(500)
        .send("An error occurred while fetching referral details.");
    });
});




router.get("/partner-dashboard", verifyPartner, async (req, res) => {
  try {
    const instituteid = req.session.partner.instituteid;
    console.log("Institute ID from session:", instituteid);

    const referredByCount = await serviceHelpers.getUniqueReferredByCount(
      instituteid
    );

    console.log("ReferredBy Count from Helper:", referredByCount);

    // Render the dashboard with the count
    res.render("user/partner-dashboard", {
      partner: req.session.partner,
      referredByCount: referredByCount,
    });
  } catch (error) {
    console.error("Error fetching ReferredBy count:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/partner-client-track", verifyPartner, (req, res) => {
  res.render("user/partner-client-track", { user: true });
});

router.get("/testimonials", (req, res) => {
  res.render("user/Youtube", { user: true });
});


router.get("/partner-payout-track", verifyPartner, (req, res) => {
const instituteid = req.session.partner.instituteid; // Get the instituteid from session

  serviceHelpers
    .getAllPatnerTrack(instituteid)
    .then((referredBy) => {
      res.render("user/partner-payout-track", {
        admin: true,
        referredBy, // Pass the filtered referredBy data to the view
        partner: req.session.partner,
      });
    })
    .catch((error) => {
      console.error("Error fetching referral details:", error);
      res
        .status(500)
        .send("An error occurred while fetching referral details.");
    });
});

router.get("/get-payment-details/:id/:studyStage", async (req, res) => {
  const { id, studyStage } = req.params;

  // Validate id
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid client ID" });
  }

  try {
    const clientData = await db
      .get()
      .collection(collection.CLIENT_COLLECTION)
      .findOne({ _id: new ObjectId(id) });

    if (!clientData) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found" });
    }

    const paymentDetails = clientData.paymentDetails[studyStage] || [];
    res.status(200).json({ success: true, paymentDetails });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching payment details" });
  }
});

router.get("/partner-creation",  (req, res) => {
  res.render("user/partner-creating", { user: false, layout: false });
});

router.post("/partner-creation", async (req, res) => {
  try {
    console.log(req.body); // Log the request body to debug

    // Extract necessary fields from request body
    const { email, otp, ...otherFields } = req.body;

    // OTP verification logic can be added here if needed

    // Proceed with partner creation
    const result = await serviceHelpers.createPartner({
      email,
      ...otherFields,
    });

    if (result.success) {
      res.status(200).json({ success: true });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error creating partner:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error: " + error.message });
  }
});




// Custom 404 Page
router.use((req, res) => {
  res.status(404).render("user/404", { user: true });
});

module.exports = router;
