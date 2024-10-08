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
const PDFDocument = require("pdfkit");
const intekartService = require("../helpers/interkart");
// // Call the function periodically (e.g., every minute)
// setInterval(checkFollowUps, 10000);
const axios = require("axios");

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

// Middleware for verifying client login
function verifyClient(req, res, next) {
  if (req.session && req.session.client) {
    next(); // Proceed to the next middleware or route handler
  } else {
    console.log("Client session not found. Redirecting to login."); // Debug log
    res.redirect("/client-department"); // Redirect to the client login page
  }
}

// Middleware for verifying client login
function verifyAccounts(req, res, next) {
  if (req.session && req.session.accounts) {
    next(); // Proceed to the next middleware or route handler
  } else {
    res.redirect("/accounts"); // Redirect to the client login page
  }
}

// Middleware for verifying client login
function verifyTl(req, res, next) {
  if (req.session && req.session.tl) {
    next(); // Proceed to the next middleware or route handler
  } else {
    res.redirect("/team-lead"); // Redirect to the client login page
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

router.get("/crm-tl-dashboard",verifyTl, async (req, res) => {
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


router.get("/crm-tl-details", verifyTl, async (req, res) => {
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


// Route to delete selected leads from both collections
router.post('/delete-leads', async (req, res) => {
  const { ids } = req.body;

  if (!ids || ids.length === 0) {
    return res.status(400).json({ success: false, message: 'No IDs provided' });
  }

  try {
    // Delete the records with the provided IDs from GOOGLESHEETS_COLLECTION
    await db.get().collection(collection.GOOGLESHEETS_COLLECTION).deleteMany({
      _id: { $in: ids.map(id => ObjectId(id)) }
    });

    // Delete the records with the provided IDs from REFERRAL_COLLECTION
    await db.get().collection(collection.REFERRAL_COLLECTION).deleteMany({
      _id: { $in: ids.map(id => ObjectId(id)) }
    });

    res.json({ success: true, message: 'Records deleted from both collections successfully' });
  } catch (error) {
    console.error('Error deleting records:', error);
    res.status(500).json({ success: false, message: 'Failed to delete records' });
  }
});

router.get("/crm-tl-assigned", verifyTl, async (req, res) => {
  try {
    const { leadOwnerEmail, startDate, endDate, state, city, course, id } = req.query;
    const leadStage = await serviceHelpers.getAllLeadStage();

    const uniqueLeadStages = Array.from(
      new Set(leadStage.map((stage) => stage.mainStage))
    ).map((mainStage) => {
      return leadStage.find((stage) => stage.mainStage === mainStage);
    });

    let matchCriteria = {};

    if (id) {
      matchCriteria._id = { $in: Array.isArray(id) ? id : [id] };
    } else {
      if (leadOwnerEmail) matchCriteria.leadOwnerName = leadOwnerEmail;
      if (state) matchCriteria.state = state;
      if (city) matchCriteria.city = city;
      if (course) matchCriteria.course = course;
      if (startDate && endDate) {
        matchCriteria.assignDate = { $gte: startDate, $lte: endDate };
      }
    }

    const googlesheets = await serviceHelpers.getAllGooglsheets(matchCriteria);
    const referrals = await serviceHelpers.getAllReferral(matchCriteria);

    const filteredGooglesheets = googlesheets.map((item) => ({
      ...item,
      source: item.source || "N/A",
    }));
    const referralsWithSource = referrals.map((item) => ({
      ...item,
      source: item.source || "N/A",
    }));

    let combinedData = [...filteredGooglesheets, ...referralsWithSource].filter(
      (item) => item.assignLead === "assigned"
    );

    const filterFields = [
      "email",
      "mobile",
   
    ];

    filterFields.forEach((field) => {
      if (req.query[field]) {
        const values = Array.isArray(req.query[field])
          ? req.query[field]
          : [req.query[field]];
        combinedData = combinedData.filter((item) => values.includes(item[field]));
      }
    });

    const leadOwners = await serviceHelpers.getAllLeadOwners();

    res.render("user/crm-tl-assigned", {
      admin: true,
      googlesheets: combinedData,
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


router.get("/crm-tl-referral", verifyTl, (req, res) => {
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

router.post("/crm-tl-referral", verifyTl, async (req, res) => {
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

router.post("/crm-tl-referral-scratch", verifyTl, async (req, res) => {
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

router.post("/update-senumber", async (req, res) => {
  const { id, senumber } = req.body;

  try {
    // Build the query to check if the ID is a valid ObjectId or use it as a plain string
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };

    // Fetch the lead data from both collections
    const [googlesheet, referral] = await Promise.all([
      db.get().collection(collection.GOOGLESHEETS_COLLECTION).findOne(query),
      db.get().collection(collection.REFERRAL_COLLECTION).findOne(query),
    ]);

    // Determine which collection the document exists in
    if (googlesheet) {
      // Update the document in GOOGLESHEETS_COLLECTION
      await db
        .get()
        .collection(collection.GOOGLESHEETS_COLLECTION)
        .updateOne(
          query, // Use the query to find the document
          { $set: { senumber: senumber } } // Update the senumber field
        );
    } else if (referral) {
      // Update the document in REFERRAL_COLLECTION
      await db
        .get()
        .collection(collection.REFERRAL_COLLECTION)
        .updateOne(
          query, // Use the query to find the document
          { $set: { senumber: senumber } } // Update the senumber field
        );
    } else {
      // If no document was found in either collection
      return res.json({
        success: false,
        message: "No document found in either collection.",
      });
    }

    // Success response
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating senumber:", error);
    res.json({
      success: false,
      message: "An error occurred while updating the senumber.",
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
    res.render("user/crmleadowners-dash", {
      user: true,
      totalLeads,
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



// router.get("/crm-lead-owner-dashboard", verifyLogin, async (req, res) => {
//   const sessionEmail = req.session.user.email;
//   const { startDate, endDate, filterType, stage, showLatestSubstage } =
//     req.query;

//   try {
//     // Modify the backend function to include documents
//    const {
//      mainStageCounts,
//      stageCounts,
//      subStageCounts,
//      totalLeads,
//      documents, // Ensure documents are included here
//    } = await serviceHelpers.getLeadStatusCounts(
//      sessionEmail,
//      startDate,
//      endDate,
//      filterType,
//      stage,
//      showLatestSubstage === "true"
//    );




//       res.render("user/crmleadowners-dash", {
//         user: true,
//         totalLeads,
//         stage,
//         mainStageCounts,
//         stageCounts,
//         subStageCounts,
//         showLatestSubstage: showLatestSubstage === "true",
//         userEmail: req.session.user.email,
//         userName: req.session.user.name,
//         documents, // Ensure this is passed to the template
//       });

//   } catch (error) {
//     console.error("Error fetching lead status counts:", error);
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// });


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
    // Fetch lead stage data
    const leadStage = await serviceHelpers.getAllLeadStage();
    const uniqueLeadStages = Array.from(
      new Set(leadStage.map((stage) => stage.mainStage))
    ).map((mainStage) =>
      leadStage.find((stage) => stage.mainStage === mainStage)
    );

    // Fetch lead owner data from session
    const leadOwnerName = req.session.user.email;

    // Fetch data from collections
    const [googlesheets, referrals, leadOwners] = await Promise.all([
      serviceHelpers.getAllGooglsheets(),
      serviceHelpers.getAllReferral(),
      serviceHelpers.getAllLeadOwners(),
    ]);

    // Combine data from both collections
    const combinedData = [...googlesheets, ...referrals];

    // Log incoming _id from query parameters
    console.log("Query _id:", req.query._id);

    // Filter combined data based on query parameters
    let filteredData = combinedData.filter(
      (item) => item.leadOwnerName === leadOwnerName && item.assignLead !== null
    );

    // Log filtered data before applying further filters
    console.log("Filtered Data before _id filter:", filteredData);

    // Handle multiple filters for name, email, etc.
    const filterFields = ["email"];
    filterFields.forEach((field) => {
      if (req.query[field]) {
        const values = Array.isArray(req.query[field])
          ? req.query[field]
          : [req.query[field]];
        filteredData = filteredData.filter((item) =>
          values.includes(item[field])
        );
      }
    });

    // Log filtered data after _id filter
    console.log("Filtered Data after _id filter:", filteredData);

    // Sort data by assignDate
    const sortedData = filteredData.sort(
      (a, b) => new Date(b.assignDate) - new Date(a.assignDate)
    );

    // Log sorted data
    console.log("Sorted Data:", sortedData);

    // Render the view with filtered and sorted data
    res.render("user/crmleadowners-details", {
      admin: true,
      googlesheets: sortedData,
      leadOwners,
      leadStage: uniqueLeadStages,
      userEmail: req.session.user.email,
      userName: req.session.user.name,
    });
  } catch (error) {
    console.error("Error fetching lead details:", error);
    res.status(500).send("Internal Server Error");
  }
});

// router.post("/crm-lead-owner-details", async (req, res) => {
//   try {
//     // Parse the list of IDs from the request body
//     const ids = JSON.parse(req.body.ids);

//     // Fetch lead owner data from session
//     const leadOwnerName = req.session.user.email;

//     // Fetch data from collections (similar to the GET request handler)
//     const [googlesheets, referrals, leadOwners] = await Promise.all([
//       serviceHelpers.getAllGooglsheets(),
//       serviceHelpers.getAllReferral(),
//       serviceHelpers.getAllLeadOwners(),
//     ]);

//     // Combine data from both collections
//     const combinedData = [...googlesheets, ...referrals];

//     // Filter combined data based on the lead owner and assigned lead
//     let filteredData = combinedData.filter(
//       (item) => item.leadOwnerName === leadOwnerName && item.assignLead !== null
//     );

//     // Filter the data based on the provided IDs
//     if (ids.length > 0) {
//       filteredData = filteredData.filter((item) =>
//         ids.includes(item._id.toString())
//       );
//     }

//     // Continue with the logic to render or send the response
//     res.render("user/crmleadowners-details", {
//       // Pass required data to the view
//       googlesheets: filteredData, // Use the filtered data here
//       leadOwners, // Pass the leadOwners data if needed
//       // Add any other required variables for rendering the view
//     });
//   } catch (error) {
//     console.error("Error processing POST request:", error);
//     res.status(500).send("Internal Server Error");
//   }
// });

// router.get("/crm-lead-owner-details", async (req, res) => {
//   // Check if the user is logged in
//   if (!req.session.user) {
//     return res.redirect("/lead-login");
//   }

//   try {
//     // Fetch lead stage data
//     const leadStage = await serviceHelpers.getAllLeadStage();
//     const uniqueLeadStages = Array.from(
//       new Set(leadStage.map((stage) => stage.mainStage))
//     ).map((mainStage) =>
//       leadStage.find((stage) => stage.mainStage === mainStage)
//     );

//     // Fetch lead owner data from session
//     const leadOwnerName = req.session.user.email;

//     // Fetch data from collections
//     const [googlesheets, referrals, leadOwners] = await Promise.all([
//       serviceHelpers.getAllGooglsheets(),
//       serviceHelpers.getAllReferral(),
//       serviceHelpers.getAllLeadOwners(),
//     ]);

//     // Combine data from both collections
//     const combinedData = [...googlesheets, ...referrals];

//     // Log incoming ids from query parameters
//     console.log("Query ids:", req.query.ids);

//     // Parse the ids field to handle multiple IDs (comma-separated)
//     const ids = req.query.ids ? req.query.ids.split(",") : [];

//     // Filter combined data based on the lead owner and assignLead fields
//     let filteredData = combinedData.filter(
//       (item) => item.leadOwnerName === leadOwnerName && item.assignLead !== null
//     );

//     console.log("Filtered Data before ids filter:", filteredData);

//     // Filter the data by multiple ids if any exist
//     if (ids.length > 0) {
//       filteredData = filteredData.filter(
//         (item) => ids.includes(item._id.toString()) // Cast _id to string to match
//       );
//     }

//     console.log("Filtered Data after ids filter:", filteredData);

//     // Sort data by assignDate
//     const sortedData = filteredData.sort(
//       (a, b) => new Date(b.assignDate) - new Date(a.assignDate)
//     );

//     console.log("Sorted Data:", sortedData);

//     // Extract additional query parameters
//     const { startDate, endDate, filterType, stage, showLatestSubstage } =
//       req.query;

//     // Fetch lead status counts
//     const {
//       mainStageCounts,
//       stageCounts,
//       subStageCounts,
//       totalLeads,
//       documents,
//     } = await serviceHelpers.getLeadStatusCountsok(
//       leadOwnerName,
//       startDate,
//       endDate
//     );

//     // Render the view with filtered and sorted data
//     res.render("user/crmleadowners-details", {
//       admin: true,
//       googlesheets: sortedData,
//       leadOwners,
//       leadStage: uniqueLeadStages,
//       userEmail: req.session.user.email,
//       userName: req.session.user.name,
//       mainStageCounts,
//       stageCounts,
//       subStageCounts,
//       totalLeads,
//       documents,
//     });
//   } catch (error) {
//     console.error("Error fetching lead details:", error);
//     res.status(500).send("Internal Server Error");
//   }
// });





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

router.get("/client-dashboard", verifyClient, (req, res) => {
  res.render("user/client-dashboard", { user: true });
});
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error logging out:", err);
      return res.status(500).send("Error logging out.");
    }
    res.redirect("/client-login"); // Redirect to login after logout
  });
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


router.get("/accounts-client-details",verifyAccounts, (req, res) => {
   serviceHelpers
    .getAllClientdashboard()
    .then((formData) => {
      console.log(formData);
      res.render("user/accounts-client-details", {
        admin: true,
        formData,
      });
    })
    .catch((error) => {
      console.error("Error fetching client details:", error);
      res.status(500).send("An error occurred while fetching client details.");
    });
});
 

router.get("/accounts-wallets",verifyAccounts, async (req, res) => {
  try {
    const supers = await serviceHelpers.getAllSuper();

    if (supers.length === 0) {
      return res.status(404).json({ message: "No institutes found" });
    }

    const institutesWithWallets = supers.map((institute) => {
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

      return {
        ...institute,
        totalWalletAmount,
        totalWalletAmountP,
      };
    });

    res.render("user/accounts-wallet", {
      institutes: institutesWithWallets,
      currentDate: new Date(),
    });
  } catch (error) {
    console.error("Error retrieving institutes:", error);
    res.status(500).json({
      message: "An error occurred while retrieving the institutes.",
    });
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

  console.log("Institute ID from session:", instituteid);

  // Fetch both referral and referredBy data
  Promise.all([
    serviceHelpers.getAllPatnerReferral(instituteid),
    serviceHelpers.getAllPatnerTrack(instituteid), // This returns `referredBy`
  ])
    .then(([referral, referredBy]) => {
      // Log the received data to inspect their structure
      console.log("Referral Data:", JSON.stringify(referral, null, 2));
      console.log("ReferredBy Data:", JSON.stringify(referredBy, null, 2));

      // Map over referral data to add matching status based on referredBy data
      referral = referral.map((ref) => {
        const refEmail = ref.email.trim().toLowerCase(); // Normalize referral email

        // Log the current referral email being processed
        console.log(`Processing referral with email: ${refEmail}`);

        const match = referredBy.find(
          (rb) =>
            rb.email.trim().toLowerCase() === refEmail &&
            rb.referredBy === instituteid
        );

        // Log whether a match was found
        if (match) {
          console.log(`Match found for email: ${ref.email}`);
        } else {
          console.log(`No match found for email: ${ref.email}`);
        }

        // Add the leadStageStatus based on the match
        ref.leadStageStatus = match ? "✔" : "✘"; // Mark as 'tick' or 'wrong'
        return ref;
      });

      // Render the view with the modified referral data
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
  const validIdPattern = /^(IEH-\d+|SAMPLE007)$/;
  
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


router.get("/p-details", verifyClient, async (req, res) => {
  try {
    // Fetch wallet data for partners
    const partners = await serviceHelpers.getAllPartners();

    // Render the data on the user/client-p-details template
    res.render("user/client-p-details", { partners });
  } catch (error) {
    console.error("Error fetching partner details:", error);
    res.status(500).send("Internal Server Error");
  }
});

// // Route to send bulk WhatsApp messages
// router.post('/send-bulk-message', async (req, res) => {
//   const { message, numbers } = req.body;

//   try {
//     // Use Interakt API to send messages
//     const result = await intekartService.sendBulkMessage(numbers, message);

//     // Send a successful response back to the frontend
//     res.json({ success: true, result });
//   } catch (error) {
//     console.error('Error sending bulk messages:', error);
//     res.status(500).json({ success: false, message: 'Failed to send messages' });
//   }
// });

// Interakt API Key
const apiKey = "b3hCczZhNHJWdFFpSWd0NDFNUFd1b0NyYnJtUDc1VnNSd1NVeGNuN09NWTo=";  // Replace with your actual Interakt API Key

const encodedCredentials = Buffer.from(`${apiKey}:`).toString("base64"); // Encode for Basic Auth

// router.post("/send-bulk-message", async (req, res) => {
//   const { numbers } = req.body;

//   try {
//     // Ensure numbers array exists
//     if (!numbers || numbers.length === 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Numbers not provided" });
//     }

//     const messageTemplate =
//       "Dear Customer, we regret to inform you that your selection criteria do not match with any of our universities. Kindly resubmit the form or contact our help desk.";

//     // Function to send message to each number
//     const promises = numbers.map((number) => {
//       return axios
//         .post(
//           "https://api.interakt.ai/v1/public/message/",
//           {
//             countryCode: "+91", // Assuming country code for India, replace if needed
//             phoneNumber: number,
//             type: "Text",
//             callbackData: "bulk_message", // Optional data for callback
//             template: {
//               name: "sample_template_test", // Ensure this matches a defined template
//               languageCode: "en", // Assuming English language
//               headerValues: [], // Assuming no header values are needed
//               bodyValues: [messageTemplate], // Predefined message for all recipients
//               buttonValues: {
//                 0: ["https://suggest.indianeduhub.in/"], // URL for resubmission
//                 1: ["7411370505"], // Help desk phone number
//               },
//             },
//           },
//           {
//             headers: {
//               Authorization: `Basic ${encodedCredentials}`,
//               "Content-Type": "application/json",
//             },
//             timeout: 5000, // Optional: Add a timeout for each request
//           }
//         )
//         .then(() => ({
//           success: true,
//           number,
//         }))
//         .catch((err) => {
//           // Error handling with detailed logging
//           if (err.response) {
//             console.error(`Failed to send message to ${number}:`, {
//               status: err.response.status,
//               data: err.response.data,
//               headers: err.response.headers,
//             });
//           } else {
//             console.error(`Failed to send message to ${number}:`, err.message);
//           }
//           return { success: false, number, error: err.message };
//         });
//     });

//     // Wait for all promises (messages) to resolve
//     const results = await Promise.all(promises);

//     // Respond with the success/failure status of each message
//     res.json({ success: true, results });
//   } catch (error) {
//     console.error("Error sending bulk messages:", error.message);
//     res.status(500).json({ success: false, error: error.message });
//   }
// });


// router.post("/send-bulk-message-p", async (req, res) => {
//   const { numbers, names, selectedInt, templateName } = req.body; // Include templateName

//   try {
//     if (!numbers || numbers.length === 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Numbers not provided" });
//     }

//     if (
//       !names ||
//       names.length !== numbers.length ||
//       !selectedInt ||
//       selectedInt.length !== numbers.length
//     ) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Names or institute names not provided or do not match the number of recipients",
//       });
//     }

//     const mediaUrl =
//       "https://indianeduhub.in/wp-content/uploads/indian-hub-logo-vertical-e1662813848753.png"; // Media URL for the header image

//     const promises = numbers.map((number, index) => {
//       return axios
//         .post(
//           "https://api.interakt.ai/v1/public/message/",
//           {
//             countryCode: "+91",
//             phoneNumber: number,
//             callbackData: "bulk_positive_message",
//             type: "Template",
//             template: {
//               name: templateName, // Use dynamic template name from the request
//               languageCode: "en",
//               headerValues: [mediaUrl], // Add media URL for header image
//               bodyValues: [
//                 names[index],
//                 selectedInt[index], // Additional body values
//               ],
//             },
//           },
//           {
//             headers: {
//               Authorization: `Basic b3hCczZhNHJWdFFpSWd0NDFNUFd1b0NyYnJtUDc1VnNSd1NVeGNuN09NWTo=`, // Replace with your actual credentials
//               "Content-Type": "application/json",
//             },
//             timeout: 5000,
//           }
//         )
//         .then(() => ({ success: true, number }))
//         .catch((err) => {
//           if (err.response) {
//             // Log detailed error and send back to client
//             console.error(
//               `Failed to send message to ${number}:`,
//               err.response.data
//             );
//             return {
//               success: false,
//               number,
//               error: err.response.data.message || "Failed to send message.",
//             };
//           } else {
//             console.error(`Failed to send message to ${number}:`, err.message);
//             return { success: false, number, error: err.message };
//           }
//         });
//     });

//     const results = await Promise.all(promises);

//     // Check if any result is unsuccessful
//     const hasErrors = results.some((result) => !result.success);
//     res.json({ success: !hasErrors, results });
//   } catch (error) {
//     console.error("Error sending bulk messages:", error.message);
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// Configure Multer for file uploads
// Configure storage for image and video uploads


router.get("/client-students", verifyClient, (req, res) => {
  serviceHelpers
    .getAllClientdashboard()
    .then((formData) => {
      console.log(formData);
      res.render("user/client-students", {
        admin: true,
        formData,
      });
    })
    .catch((error) => {
      console.error("Error fetching client details:", error);
      res.status(500).send("An error occurred while fetching client details.");
    });
});


// Configure storage for image and video uploads
const storagew = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Make sure the uploads directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});

// File filter for images and videos
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|webp|png|gif|mp4|mov|avi|mkv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb("Error: Invalid file type. Only images and videos are allowed.");
  }
};

// Multer instance for file upload
const uploadw = multer({ 
  storage: storagew,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Media Upload Endpoint
router.post("/upload-media", uploadw.single("media"), (req, res) => {
  // Handle missing file
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  // Construct the media URL based on where files are saved on your server
  const mediaUrl = `https://crm.indianeduhub.in/uploads/${req.file.filename}`;

  // Return the media URL in the response
  res.json({ success: true, url: mediaUrl });
});

router.post("/send-bulk-message-student", async (req, res) => {
  const { numbers, names, institutes, templateName, mediaUrl } = req.body; // Include mediaUrl

  try {
    if (!numbers || numbers.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Numbers not provided" });
    }

    if (
      !names ||
      names.length !== numbers.length ||
      !institutes ||
      institutes.length !== numbers.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Names or institute names not provided or do not match the number of recipients",
      });
    }

    const promises = numbers.map((number, index) => {
      return axios
        .post(
          "https://api.interakt.ai/v1/public/message/",
          {
            countryCode: "+91",
            phoneNumber: number,
            callbackData: "bulk_positive_message",
            type: "Template",
            template: {
              name: templateName,
              languageCode: "en",
              headerValues: [mediaUrl], // Add media URL dynamically
              bodyValues: [names[index]], // Replace with appropriate values for the message body
            },
          },
          {
            headers: {
              Authorization: `Basic b3hCczZhNHJWdFFpSWd0NDFNUFd1b0NyYnJtUDc1VnNSd1NVeGNuN09NWTo=`, // Replace with your actual credentials
              "Content-Type": "application/json",
            },
            timeout: 5000,
          }
        )
        .then(() => ({ success: true, number }))
        .catch((err) => {
          if (err.response) {
            console.error(
              `Failed to send message to ${number}:`,
              err.response.data
            );
            return {
              success: false,
              number,
              error: err.response.data.message || "Failed to send message.",
            };
          } else {
            console.error(`Failed to send message to ${number}:`, err.message);
            return { success: false, number, error: err.message };
          }
        });
    });

    const results = await Promise.all(promises);
    const hasErrors = results.some((result) => !result.success);
    res.json({ success: !hasErrors, results });
  } catch (error) {
    console.error("Error sending bulk messages:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/send-bulk-message-p", async (req, res) => {
  const { numbers, names, selectedInt, templateName, mediaUrl } = req.body; // Include mediaUrl

  try {
    // Check if numbers are provided
    if (!numbers || numbers.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Numbers not provided" });
    }

    // Ensure names and selectedInt arrays match numbers array length
    if (
      !names ||
      names.length !== numbers.length ||
      !selectedInt ||
      selectedInt.length !== numbers.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Names or institute names not provided or do not match the number of recipients",
      });
    }

    // Loop through all numbers and send the template message
    const promises = numbers.map((number, index) => {
      return axios
        .post(
          "https://api.interakt.ai/v1/public/message/",
          {
            countryCode: "+91",
            phoneNumber: number,
            callbackData: "bulk_positive_message",
            type: "Template",
            template: {
              name: templateName,
              languageCode: "en",
              headerValues: [mediaUrl], // Add media URL dynamically
              bodyValues: [names[index]], // Dynamically add recipient's name
            },
          },
          {
            headers: {
              Authorization: `Basic b3hCczZhNHJWdFFpSWd0NDFNUFd1b0NyYnJtUDc1VnNSd1NVeGNuN09NWTo=`, // Replace with your actual credentials
              "Content-Type": "application/json",
            },
            timeout: 5000, // Adjust as necessary
          }
        )
        .then(() => ({ success: true, number })) // Return success for each message
        .catch((err) => {
          if (err.response) {
            // Log API error responses
            console.error(
              `Failed to send message to ${number}:`,
              err.response.data
            );
            return {
              success: false,
              number,
              error: err.response.data.message || "Failed to send message.",
            };
          } else {
            // Log network or other errors
            console.error(`Failed to send message to ${number}:`, err.message);
            return { success: false, number, error: err.message };
          }
        });
    });

    // Wait for all API calls to resolve
    const results = await Promise.all(promises);
    const hasErrors = results.some((result) => !result.success);
    res.json({ success: !hasErrors, results }); // Send response with all results
  } catch (error) {
    console.error("Error sending bulk messages:", error.message);
    res.status(500).json({ success: false, error: error.message }); // Catch unexpected errors
  }
});


// // Configure multer to accept only image files
// const storages = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/'); // Specify the uploads directory
//   },
//   filename: function (req, file, cb) {
//     // Use the original file name or generate a new name
//     const ext = path.extname(file.originalname);
//     cb(null, `${Date.now()}${ext}`); // Ensure the file has an extension
//   }
// });

// const uploadwh = multer({
//   storage: storages,
//   fileFilter: (req, file, cb) => {
//     const ext = path.extname(file.originalname).toLowerCase();
//     // Accept only jpg, jpeg, and png file types
//     if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
//       cb(null, true);
//     } else {
//       cb(new Error("Only images are allowed (jpg, jpeg, png)"));
//     }
//   },
// });

// router.post(
//   "/send-bulk-message-ap",
//   uploadwh.single("image"),
//   async (req, res) => {
//     try {
//       const numbers = JSON.parse(req.body.numbers);
//       const names = JSON.parse(req.body.names);
//       const institutes = JSON.parse(req.body.institutes);
//       const templateName = req.body.templateName;
//       const imageFile = req.file;

//       if (!numbers || numbers.length === 0) {
//         return res
//           .status(400)
//           .json({ success: false, message: "Numbers not provided" });
//       }

//       if (
//         !names ||
//         names.length !== numbers.length ||
//         !institutes ||
//         institutes.length !== numbers.length
//       ) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "Names or institute names not provided or do not match the number of recipients",
//         });
//       }

//       const promises = numbers.map((number, index) => {
//         const messageData = {
//           countryCode: "+91",
//           phoneNumber: number,
//           callbackData: "bulk_positive_message",
//           type: "Template",
//           template: {
//             name: templateName,
//             languageCode: "en",
//             headerValues: [],
//             bodyValues: [names[index], institutes[index]],
//           },
//         };

//         if (imageFile) {
//           const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
//             imageFile.filename
//           }`;
//           messageData.template.headerValues.push({
//             type: "Image",
//             link: imageUrl,
//           });
//         }

//         return axios
//           .post("https://api.interakt.ai/v1/public/message/", messageData, {
//             headers: {
//               Authorization: `Basic b3hCczZhNHJWdFFpSWd0NDFNUFd1b0NyYnJtUDc1VnNSd1NVeGNuN09NWTo=`, // Replace with actual credentials
//               "Content-Type": "application/json",
//             },
//             timeout: 350000,
//           })
//           .then(() => ({ success: true, number }))
//           .catch((err) => {
//             console.error(
//               `Failed to send message to ${number}:`,
//               JSON.stringify(err, null, 2)
//             );

//             if (err.response) {
//               // Log full response data for debugging
//               console.error(
//                 "Full response data:",
//                 JSON.stringify(err.response.data, null, 2)
//               );

//               return {
//                 success: false,
//                 number,
//                 error: err.response.data.message || "Failed to send message.",
//                 errorDetails: err.response.data || err.message,
//               };
//             } else {
//               return {
//                 success: false,
//                 number,
//                 error: err.message || "Failed to send message.",
//                 errorDetails: err,
//               };
//             }
//           });

//       });

//       const results = await Promise.all(promises);
//       const hasErrors = results.some((result) => !result.success);
//       res.json({ success: !hasErrors, results });
//     } catch (error) {
//       console.error("Error sending bulk messages:", error.message);
//       res
//         .status(500)
//         .json({
//           success: false,
//           error: "An error occurred while sending messages.",
//         });
//     }
//   }
// );



router.post("/send-bulk-message-ap", async (req, res) => {
  const { numbers, names, institutes, templateName, mediaUrl } = req.body; // Use "institutes" here to match the frontend

  try {
    if (!numbers || numbers.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Numbers not provided" });
    }

    if (
      !names ||
      names.length !== numbers.length ||
      !institutes ||
      institutes.length !== numbers.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Names or institute names not provided or do not match the number of recipients",
      });
    }

    const promises = numbers.map((number, index) => {
      return axios
        .post(
          "https://api.interakt.ai/v1/public/message/",
          {
            countryCode: "+91",
            phoneNumber: number,
            callbackData: "bulk_positive_message",
            type: "Template",
            template: {
              name: templateName, // Use dynamic template name from the request
              languageCode: "en",
              headerValues: [mediaUrl], // No PDF link required
              bodyValues: [names[index]], // Pass owner name
            },
          },
          {
            headers: {
              Authorization: `Basic b3hCczZhNHJWdFFpSWd0NDFNUFd1b0NyYnJtUDc1VnNSd1NVeGNuN09NWTo=`, // Replace with your actual credentials
              "Content-Type": "application/json",
            },
            timeout: 5000,
          }
        )
        .then(() => ({ success: true, number }))
        .catch((err) => {
          if (err.response) {
            // Log detailed error and send back to client
            console.error(
              `Failed to send message to ${number}:`,
              err.response.data
            );
            return {
              success: false,
              number,
              error: err.response.data.message || "Failed to send message.",
            };
          } else {
            console.error(`Failed to send message to ${number}:`, err.message);
            return { success: false, number, error: err.message };
          }
        });
    });

    const results = await Promise.all(promises);

    // Check if any result is unsuccessful
    const hasErrors = results.some((result) => !result.success);
    res.json({ success: !hasErrors, results });
  } catch (error) {
    console.error("Error sending bulk messages:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});




// router.post("/send-bulk-message", async (req, res) => {
//   const { message, numbers } = req.body;

//   try {
//     const promises = numbers.map((number) => {
//       return axios
//         .post(
//           "https://api.interakt.ai/v1/public/message/",
//           {
//             fullPhoneNumber: `91${number}`, // Format mobile number with country code
//             callbackData: "bulk_message",
//             type: "Text",
//             data: {
//               message: message,
//             },
//           },
//           {
//             headers: {
//               Authorization: `Basic ${apiKey}`,
//               "Content-Type": "application/json",
//             },
//             timeout: 5000, // Optional: Add timeout for each request
//           }
//         )
//         .then(() => ({
//           success: true,
//           number,
//         }))
//         .catch((err) => {
//           if (err.response) {
//             console.error(`Failed to send message to ${number}:`, {
//               status: err.response.status,
//               data: err.response.data,
//               headers: err.response.headers,
//             });
//           } else {
//             console.error(`Failed to send message to ${number}:`, err.message);
//           }
//           return { success: false, number, error: err.message };
//         });

//     });

//     const results = await Promise.all(promises);
//     res.json({ success: true, results });
//   } catch (error) {
//     console.error("Error sending bulk messages:", error.message); // Log only the message
//     res.status(500).json({ success: false, error: error.message });
//   }
// });


router.get("/ap-details",verifyClient, async (req, res) => {
  try {
    // Fetch wallet data for partners
    const apartners = await serviceHelpers.getAllAFPartners();

    // Render the data on the user/client-p-details template
    res.render("user/client-ap-details", { apartners });
  } catch (error) {
    console.error("Error fetching partner details:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/accounts-invoice",verifyAccounts, async (req, res) => {
  try {
    const { statusFilter } = req.query; // Get the status filter from the query params

    // Fetch wallet data for partners and affiliates
    const partners = await serviceHelpers.getAllPartners();
    const afpartners = await serviceHelpers.getAllAFPartners();

    // Combine wallet data from both partners and affiliates
    const allWallets = [];

    partners.forEach((partner) => {
      if (Array.isArray(partner.wallet)) {
        // Add partner wallet data with institutename and instituteid to the array
        partner.wallet.forEach((walletEntry) => {
          allWallets.push({
            ...walletEntry,
            institutename: partner.institutename,
            instituteid: partner.instituteid,
          });
        });
      }
    });

    afpartners.forEach((afpartner) => {
      if (Array.isArray(afpartner.wallet)) {
        // Add affiliate wallet data with institutename and instituteid to the array
        afpartner.wallet.forEach((walletEntry) => {
          allWallets.push({
            ...walletEntry,
            institutename: afpartner.name,
            instituteid: afpartner.instituteid,
          });
        });
      }
    });

    // Filter based on the query parameter
    let filteredWallets = allWallets;

    // Apply filter based on the statusFilter query
    if (statusFilter === "raised") {
      // Only include entries where isRaised is true
      filteredWallets = allWallets.filter((entry) => entry.isRaised === true);
    } else if (statusFilter === "not-raised") {
      // Include entries where isRaised is either false or undefined (i.e., missing)
      filteredWallets = allWallets.filter(
        (entry) => entry.isRaised === false || entry.isRaised === undefined
      );
    } else if (statusFilter === "credited") {
      // Only include entries where isCredited is true
      filteredWallets = allWallets.filter((entry) => entry.isCredited === true);
    } else if (statusFilter === "pending") {
      // Only include entries where isCredited is false or undefined
      filteredWallets = allWallets.filter(
        (entry) => entry.isCredited === false || entry.isCredited === undefined
      );
    }

    // Ensure that the wallet entries have default values for missing fields
    filteredWallets.forEach((entry) => {
      if (entry.isCredited === undefined) {
        entry.isCredited = false;
      }
    });

    // Sort by date in descending order (latest first)
    filteredWallets.sort((a, b) => new Date(b.raisedAt) - new Date(a.raisedAt));

    // Pass the filtered and sorted wallet data to the template
    res.render("user/accounts-invoice", { raisedDetails: filteredWallets });
  } catch (error) {
    console.error("Error fetching accounts invoice data:", error);
    res.status(500).send("Internal Server Error");
  }
});






router.post("/update-wallet-status-bulk-ac", async (req, res) => {
  try {
    const { indexes, isCredited } = req.body;
    const currentDate = new Date();
    const objectIds = indexes.map((index) => {
      if (!ObjectId.isValid(index)) {
        throw new Error(`Invalid ObjectId: ${index}`);
      }
      return new ObjectId(index);
    });

    // Update partner wallets
    await Promise.all(
      objectIds.map(async (id) => {
        const result = await db
          .get()
          .collection(collection.PATNER_COLLECTION)
          .updateMany(
            { "wallet._id": id },
            {
              $set: {
                "wallet.$.isCredited": isCredited,
                "wallet.$.creditedAt": isCredited ? currentDate : null,
              },
            }
          );
        if (result.matchedCount === 0) {
          console.warn(
            `No document matched for partner wallet entry with id: ${id}`
          );
        }
      })
    );

    // Update affiliate wallets
    await Promise.all(
      objectIds.map(async (id) => {
        const result = await db
          .get()
          .collection(collection.AFFILIATE_COLLECTION)
          .updateMany(
            { "wallet._id": id },
            {
              $set: {
                "wallet.$.isCredited": isCredited,
                "wallet.$.creditedAt": isCredited ? currentDate : null,
              },
            }
          );
        if (result.matchedCount === 0) {
          console.warn(
            `No document matched for affiliate wallet entry with id: ${id}`
          );
        }
      })
    );

    res
      .status(200)
      .json({ success: true, message: "Wallet status updated successfully" });
  } catch (error) {
    console.error("Error updating wallet status:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});









// router.get("/accounts-dashboard",verifyAccounts, async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;

//     // Log the received date filters
//     console.log("Start Date:", startDate);
//     console.log("End Date:", endDate);

//     const clientCollection = await db
//       .get()
//       .collection(collection.CLIENT_COLLECTION)
//       .find()
//       .toArray();

//     const dropdownValueCounts = {};

//     clientCollection.forEach((client) => {
//       const paymentDetails = client.paymentDetails || {};

//       const studyStages = Object.keys(paymentDetails);
//       if (studyStages.length === 0) return; // No payment details available

//       const lastStudyStage = studyStages[studyStages.length - 1];
//       const steps = paymentDetails[lastStudyStage];

//       let lastValue = null;
//       let lastDate = null;

//       for (let i = steps.length - 1; i >= 0; i--) {
//         if (steps[i].selectedValue) {
//           lastValue = steps[i].selectedValue;
//           lastDate = steps[i].date;
//           break;
//         }
//       }

//       // Log the found lastValue and lastDate
//       console.log(
//         `Client: ${client.name}, Last Value: ${lastValue}, Last Date: ${lastDate}`
//       );

//       if (lastValue && lastDate) {
//         const lastDateObj = new Date(lastDate);
//         console.log("Last Date Object:", lastDateObj);

//         if (startDate && endDate) {
//           const startDateObj = new Date(startDate);
//           const endDateObj = new Date(endDate);
//           console.log(
//             "Start Date Object:",
//             startDateObj,
//             "End Date Object:",
//             endDateObj
//           );

//           if (lastDateObj >= startDateObj && lastDateObj <= endDateObj) {
//             console.log(`Counted: ${lastValue} (within date range)`);
//             dropdownValueCounts[lastValue] =
//               (dropdownValueCounts[lastValue] || 0) + 1;
//           }
//         } else if (startDate && !endDate) {
//           const startDateObj = new Date(startDate);
//           console.log("Single Start Date Object:", startDateObj);

//           if (lastDateObj.getTime() === startDateObj.getTime()) {
//             console.log(`Counted: ${lastValue} (on single date)`);
//             dropdownValueCounts[lastValue] =
//               (dropdownValueCounts[lastValue] || 0) + 1;
//           }
//         } else {
//           console.log(`Counted: ${lastValue} (no date filter applied)`);
//           dropdownValueCounts[lastValue] =
//             (dropdownValueCounts[lastValue] || 0) + 1;
//         }
//       }
//     });

//     console.log("Final Dropdown Counts:", dropdownValueCounts);

//     res.render("user/accounts-dashboard", {
//       user: true,
//       dropdownValueCounts,
//     });
//   } catch (error) {
//     console.error("Error fetching account details for dashboard:", error);
//     res.status(500).send("Error loading the dashboard");
//   }
// });


router.get("/accounts-dashboard", verifyAccounts, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Log the received date filters
    console.log("Start Date:", startDate);
    console.log("End Date:", endDate);

    const clientCollection = await db
      .get()
      .collection(collection.CLIENT_COLLECTION)
      .find()
      .toArray();

    const dropdownValueCounts = {};
    let totalAmtCount = 0;
    let totalExpectedAmtCount = 0;

    clientCollection.forEach((client) => {
      const paymentDetails = client.paymentDetails || {};
      const studyStages = Object.keys(paymentDetails);
      if (studyStages.length === 0) return; // No payment details available

      const lastStudyStage = studyStages[studyStages.length - 1];
      const steps = paymentDetails[lastStudyStage];

      let lastValue = null;
      let lastDate = null;

      for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].selectedValue) {
          lastValue = steps[i].selectedValue;
          lastDate = steps[i].date;
          break;
        }
      }

      // Filter and count the payment details based on selectedValue and date
      if (lastValue && lastDate) {
        const lastDateObj = new Date(lastDate);

        if (startDate && endDate) {
          const startDateObj = new Date(startDate);
          const endDateObj = new Date(endDate);

          if (lastDateObj >= startDateObj && lastDateObj <= endDateObj) {
            dropdownValueCounts[lastValue] =
              (dropdownValueCounts[lastValue] || 0) + 1;
          }
        } else if (startDate && !endDate) {
          const startDateObj = new Date(startDate);

          if (lastDateObj.getTime() === startDateObj.getTime()) {
            dropdownValueCounts[lastValue] =
              (dropdownValueCounts[lastValue] || 0) + 1;
          }
        } else {
          dropdownValueCounts[lastValue] =
            (dropdownValueCounts[lastValue] || 0) + 1;
        }
      }

      // Filter and count totalAMt and totalExpectedAMt
      const totalAmtDate = new Date(client.totalAMtDate);
      const totalExpectedAmtDate = new Date(client.totalExpectedAMtDate);

      if (startDate && endDate) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        if (totalAmtDate >= startDateObj && totalAmtDate <= endDateObj) {
          totalAmtCount += parseFloat(client.totalAMt || 0);
        }

        if (
          totalExpectedAmtDate >= startDateObj &&
          totalExpectedAmtDate <= endDateObj
        ) {
          totalExpectedAmtCount += parseFloat(client.totalExpectedAMt || 0);
        }
      } else if (startDate && !endDate) {
        const startDateObj = new Date(startDate);

        if (totalAmtDate.getTime() === startDateObj.getTime()) {
          totalAmtCount += parseFloat(client.totalAMt || 0);
        }

        if (totalExpectedAmtDate.getTime() === startDateObj.getTime()) {
          totalExpectedAmtCount += parseFloat(client.totalExpectedAMt || 0);
        }
      } else {
        totalAmtCount += parseFloat(client.totalAMt || 0);
        totalExpectedAmtCount += parseFloat(client.totalExpectedAMt || 0);
      }
    });

    res.render("user/accounts-dashboard", {
      user: true,
      dropdownValueCounts,
      totalAmtCount,
      totalExpectedAmtCount,
    });
  } catch (error) {
    console.error("Error fetching account details for dashboard:", error);
    res.status(500).send("Error loading the dashboard");
  }
});



router.get("/get-client-details", async (req, res) => {
  try {
    const value = req.query.value; // Fetch value from query params
    const { startDate, endDate } = req.query; // Also fetch date filters if needed

    // Fetch the client collection
    const clientCollection = await db
      .get()
      .collection(collection.CLIENT_COLLECTION)
      .find()
      .toArray();

    // Filter clients by the selected dropdown value and date filters (if paymentDetails exist)
    const filteredClients = clientCollection.filter((client) => {
      const paymentDetails = client.paymentDetails || {};
      const studyStages = Object.keys(paymentDetails);
      if (studyStages.length === 0) return false;

      const lastStudyStage = studyStages[studyStages.length - 1];
      const steps = Array.isArray(paymentDetails[lastStudyStage])
        ? paymentDetails[lastStudyStage]
        : [];

      // Find the last step with a selected value and its date
      let lastValue = null;
      let lastDate = null;
      for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].selectedValue) {
          lastValue = steps[i].selectedValue;
          lastDate = steps[i].date;
          break;
        }
      }

      if (!lastValue || lastValue !== value) return false;

      // Apply date filtering if provided
      const lastDateObj = new Date(lastDate);
      if (startDate && endDate) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        if (lastDateObj < startDateObj || lastDateObj > endDateObj) {
          return false;
        }
      } else if (startDate && !endDate) {
        const startDateObj = new Date(startDate);
        if (lastDateObj.getTime() !== startDateObj.getTime()) {
          return false;
        }
      }

      return true;
    });

    // If no clients are found, return an empty array
    if (!filteredClients.length) {
      return res.status(404).json({ message: "No client details found" });
    }

    // Render the modal content with the filtered clients
    res.json({ clients: filteredClients });
  } catch (error) {
    console.error("Error fetching client details:", error);
    res.status(500).json({ message: "Error fetching client details" });
  }
});








router.get("/get-details-by-dropdown/:value", async (req, res) => {
  const { value } = req.params;
  const { startDate, endDate } = req.query;

  try {
    // Fetch client data
    const clientCollection = await db
      .get()
      .collection(collection.CLIENT_COLLECTION)
      .find()
      .toArray();

    // Initialize an array to hold filtered clients
    let filteredClients = [];

    // Process each client in the collection
    clientCollection.forEach((client) => {
      const paymentDetails = client.paymentDetails || {};
      const studyStages = Object.keys(paymentDetails);

      // Process each study stage
      studyStages.forEach((stage) => {
        const details = paymentDetails[stage];

        // Process each detail entry
        details.forEach((detail) => {
          if (detail.selectedValue === value) {
            const detailDate = new Date(detail.date);

            // Apply date range filters if provided
            if (
              (!startDate || detailDate >= new Date(startDate)) &&
              (!endDate || detailDate <= new Date(endDate))
            ) {
              filteredClients.push({
                date: detail.date,
                studentid: client.studentid,
                name: client.name,
                course: client.course,
                email: client.email,
                mobile: client.mobile,
                state: client.state,
                specificName: client.specificName,
              });
            }
          }
        });
      });
    });

    // Remove duplicate entries based on student ID and keep the latest entry
    const latestEntries = filteredClients.reduce((acc, curr) => {
      if (
        !acc[curr.studentid] ||
        new Date(curr.date) > new Date(acc[curr.studentid].date)
      ) {
        acc[curr.studentid] = curr;
      }
      return acc;
    }, {});

    const finalClients = Object.values(latestEntries);

    // Log the final clients and their count
    console.log(`Filtered clients count: ${finalClients.length}`);
    console.log("Final clients:", finalClients);

    res.status(200).json({ success: true, clients: finalClients });
  } catch (error) {
    console.error("Error fetching client details:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching client details" });
  }
});





router.get("/accounts-details",verifyAccounts, async (req, res) => {
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

router.post("/update-accounts-details",verifyAccounts, async (req, res) => {
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
  // Check if institute.wallet is an array
  const totalWalletAmount = Array.isArray(institute.wallet)
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
      _id: new ObjectId(), // Generate a new ObjectId
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


router.get("/client-details", verifyClient, (req, res) => {
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


router.get("/team-lead", (req, res) => {
  res.render("user/team-lead-login", { user: true });
});

router.post("/team-lead", (req, res) => {
  const { email, password } = req.body;
  const validEmail = process.env.ADMINTL_EMAIL;
  const validPassword = process.env.ADMINTL_PASSWORD;

  if (email === validEmail && password === validPassword) {
    req.session.tl = email;
    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
      res.redirect("/crm-tl-dashboard");
    });
  } else {
    res.render("user/team-lead-login", {
      user: true,
      error: "Invalid email or password",
    });
  }
});


router.get("/client-department", (req, res) => {
  res.render("user/client-login", { user: true });
});

router.post("/clientlogin", (req, res) => {
  const { email, password } = req.body;
  const validEmail = process.env.ADMINCLIENT_EMAIL;
  const validPassword = process.env.ADMINCLIENT_PASSWORD;

  if (email === validEmail && password === validPassword) {
    req.session.client = email;
    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
      res.redirect("/client-details");
    });
  } else {
    res.render("user/client-login", {
      user: true,
      error: "Invalid email or password",
    });
  }
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

router.get("/se-form-client", (req, res) => {
  res.render("user/formclientdirect", { user: true });
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


router.post("/crm-create-lead", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    await serviceHelpers.createLeadOwner({ name, email, password });
    res.json({ success: true });
  } catch (error) {
    console.error("Error creating lead owner:", error);
    res.json({
      success: false,
      message:
        error.message || "An error occurred while creating the lead owner.",
    });
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
    req.session.accounts = email;
    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
      res.redirect("/accounts-dashboard");
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

// Signup route
router.get("/find-ap-email", (req, res) => {
  res.render("user/find-ap-email", {
    user: true,
  });
});

router.get("/reset-ap-password/:token", (req, res) => {
  const { token } = req.params;
  res.render("user/reset-ap-password", {
    user: true,
    token, // Pass the token to the view for form submission
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

// Route to handle forgot password
router.post("/affiliate-partner-forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const database = db.get();
    const partnersCollection = database.collection(collection.AFFILIATE_COLLECTION);

    // Check if the affiliate partner exists
    const partner = await partnersCollection.findOne({ email });

    if (!partner) {
      req.flash('error', 'Partner not found.'); // Set flash message for error
      return res.redirect('/find-ap-email'); // Redirect to the forgot password page
    }

    // Generate a token for resetting the password
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash the token before saving it to the database
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Set the token expiration time (e.g., 1 hour)
    const tokenExpiry = Date.now() + 3600000; // 1 hour in milliseconds

    // Save the token and its expiry in the database
    await partnersCollection.updateOne(
      { email },
      {
        $set: {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: tokenExpiry,
        },
      }
    );

    // Send the token via email
    const resetUrl = `https://crm.indianeduhub.in/reset-ap-password/${resetToken}`;

    // Configure nodemailer
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "clientsupport@indianeduhub.com",
        pass: "xeep ypij nhqg ilcd",
      },
    });

    // Email message options
    const mailOptions = {
      to: email,
      from: "clientsupport@indianeduhub.com",
      subject: "Password Reset",
      html: `<p>You requested for password reset</p>
             <p>Click this <a href="${resetUrl}">link</a> to reset your password. The link will expire in 1 hour.</p>`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    req.flash('success', `A password reset email has been sent to ${email}`);
    res.redirect('/find-ap-email'); // Redirect to the forgot password page
  } catch (error) {
    req.flash('error', "Internal Server Error: " + error.message);
    res.redirect('/find-ap-email'); // Redirect to the forgot password page
  }
});


router.post("/reset-ap-password/:token", async (req, res) => {
  const { password, confirmPassword } = req.body;
  const resetToken = req.params.token;

  // Check if the passwords match
  if (password !== confirmPassword) {
    req.flash("error", "Passwords do not match");
    return res.redirect(`/reset-ap-password/${resetToken}`);
  }

  try {
    const database = db.get();
    const partnersCollection = database.collection(
      collection.AFFILIATE_COLLECTION
    );

    // Hash the token
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Find partner with valid reset token and check if it's not expired
    const partner = await partnersCollection.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }, // Ensure token is still valid
    });

    if (!partner) {
      req.flash("error", "Invalid or expired token");
      return res.redirect("/find-ap-email");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update the partner's password and clear the reset token fields
    await partnersCollection.updateOne(
      { _id: partner._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: "", resetPasswordExpires: "" },
      }
    );

    req.flash("success", "Password has been reset successfully");
    res.redirect("/affiliate-partner-signup#signin");
  } catch (error) {
    req.flash("error", "Internal Server Error: " + error.message);
    res.redirect(`/reset-ap-password/${resetToken}`);
  }
});




// Signup route
router.get("/find-partner", (req, res) => {
  res.render("user/find-partner", {
    user: true,
  });
});

router.get("/reset-partner-password/:token", (req, res) => {
  const { token } = req.params;
  res.render("user/reset-partner", {
    user: true,
    token, // Pass the token to the view for form submission
  });
});




// Route to handle forgot password
router.post("/partner-forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const database = db.get();
    const partnersCollections = database.collection(collection.PATNER_COLLECTION);

    // Check if the affiliate partner exists
    const partner = await partnersCollections.findOne({ email });

    if (!partner) {
      req.flash('error', 'Partner not found.'); // Set flash message for error
      return res.redirect('/find-partner'); // Redirect to the forgot password page
    }

    // Generate a token for resetting the password
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash the token before saving it to the database
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Set the token expiration time (e.g., 1 hour)
    const tokenExpiry = Date.now() + 3600000; // 1 hour in milliseconds

    // Save the token and its expiry in the database
    await partnersCollections.updateOne(
      { email },
      {
        $set: {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: tokenExpiry,
        },
      }
    );

    // Send the token via email
    const resetUrl = `https://crm.indianeduhub.in/reset-partner-password/${resetToken}`;

    // Configure nodemailer
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "clientsupport@indianeduhub.com",
        pass: "xeep ypij nhqg ilcd",
      },
    });

    // Email message options
    const mailOptions = {
      to: email,
      from: "clientsupport@indianeduhub.com",
      subject: "Password Reset",
      html: `<p>You requested for password reset</p>
             <p>Click this <a href="${resetUrl}">link</a> to reset your password. The link will expire in 1 hour.</p>`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    req.flash('success', `A password reset email has been sent to ${email}`);
    res.redirect('/find-partner'); // Redirect to the forgot password page
  } catch (error) {
    req.flash('error', "Internal Server Error: " + error.message);
    res.redirect("/find-partner"); // Redirect to the forgot password page
  }
});


router.post("/reset-partner-password/:token", async (req, res) => {
  const { password, confirmPassword } = req.body;
  const resetToken = req.params.token;

  // Check if the passwords match
  if (password !== confirmPassword) {
    req.flash("error", "Passwords do not match");
    return res.redirect(`/reset-ap-password/${resetToken}`);
  }

  try {
    const database = db.get();
    const partnersCollection = database.collection(
      collection.PATNER_COLLECTION
    );

    // Hash the token
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Find partner with valid reset token and check if it's not expired
    const partner = await partnersCollection.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }, // Ensure token is still valid
    });

    if (!partner) {
      req.flash("error", "Invalid or expired token");
      return res.redirect("/find-ap-email");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update the partner's password and clear the reset token fields
    await partnersCollection.updateOne(
      { _id: partner._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: "", resetPasswordExpires: "" },
      }
    );

    req.flash("success", "Password has been reset successfully");
    res.redirect("/partner-signup#signin");
  } catch (error) {
    req.flash("error", "Internal Server Error: " + error.message);
    res.redirect(`/reset-partner-password/${resetToken}`);
  }
});

// router.post("/affiliate-partner-creation", async (req, res) => {
//   try {
//     console.log(req.body); // Log the request body to debug

//     const { email, otp, ...otherFields } = req.body;

//     // Direct OTP verification not needed here; it should be handled in /verify-otp

//     // Proceed with partner creation
//     const result = await serviceHelpers.createAfPartner({
//       email,
//       ...otherFields,
//     });

//     if (result.success) {
//       res.status(200).json({ success: true });
//     } else {
//       res.status(400).json(result);
//     }
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Internal Server Error: " + error.message });
//   }
// });

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
      // Send email with login details upon successful creation
      const transporter = nodemailer.createTransport({
        service: "Gmail", // or use your email service provider
        auth: {
          user: "clientsupport@indianeduhub.com",
          pass: "xeep ypij nhqg ilcd",
        },
      });

      const mailOptions = {
        from: "clientsupport@indianeduhub.com", // Sender email
        to: email, // Recipient email
        subject: "Affiliate Partner Account Created",
        html: `
          <p>Dear ${otherFields.name},</p>

<p>Welcome to the Indian Edu Hub family! We are excited to have you on board as one of our valued Affiliate Partners. Your partnership is integral to our mission of making education more accessible to all.</p>

<p>Below are your login details to access your Affiliate Dashboard, where you can track your performance, earnings, and much more:</p>

<ul>
  <li><strong>Email:</strong> ${email}</li>
  <li><strong>Password:</strong> ${otherFields.password}</li>
</ul>

<p>You can get started by clicking the link below:</p>

<p style="text-align: center;">
  <a 
    href="https://crm.indianeduhub.in/affiliate-partner-signup" 
    style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
    Log In to Your Affiliate Dashboard
  </a>
</p>

<p>If you have any questions or need assistance, feel free to reach out to our support team. We're here to help you succeed!</p>

<p>We look forward to a long and prosperous partnership together.</p>

<p>Best regards,<br><strong>The Indian Edu Hub Team</strong></p>

<p style="font-size: 12px; color: gray;">This email contains confidential information intended solely for ${otherFields.name}. If you are not the intended recipient, please notify the sender and delete this email immediately.</p>

        `,
      };

      // Send email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });

      res.status(200).json({ success: true });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error: " + error.message });
  }
});


router.get("/affiliate-partner-dashboard", verifyAffiliate, async (req, res) => {
  try {
    const instituteid = req.session.affiliate.instituteid;
    console.log("Institute ID from session:", instituteid);

    // Get the referred by count
    const referredByCount = await serviceHelpers.getUniqueReferredByCount(instituteid);

    // Fetch the referred students or data containing `idApproved` field
    const referredBy = await serviceHelpers.getAllPatnerTrack(instituteid);

    // Calculate the count of students whose ID is not approved
    const notApprovedCount = referredBy.filter(student => student.idApproved !== "Approved").length;

    // Fetch the wallet information
    const afpartners = await serviceHelpers.getAllAfPartnersW(instituteid);
    const affiliate = afpartners[0]; // Assuming you're interested in the first affiliate
    const wallet = affiliate.wallet || [];

    // Calculate the total credited amount
    const totalCreditedAmount = wallet
      .filter((entry) => entry.isCredited) // Filter credited entries
      .reduce((total, entry) => total + entry.amount, 0); // Sum the amounts

    // Calculate the total pending amount
    const totalPendingAmount = wallet
      .filter((entry) => !entry.isCredited) // Filter pending entries
      .reduce((total, entry) => total + entry.amount, 0); // Sum the amounts

    console.log("ReferredBy Count from Helper:", referredByCount);

    // Render the dashboard with the necessary data
    res.render("user/affiliate-partner-dashboard", {
      affiliate: req.session.affiliate,
      referredByCount: referredByCount,
      notApprovedCount, // Pass the not approved count to the template
      totalCreditedAmount, // Pass the total credited amount to the template
      totalPendingAmount, // Pass the total pending amount to the template
    });
  } catch (error) {
    console.error("Error fetching affiliate dashboard data:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get("/affiliate-partner-wallet", verifyAffiliate, async (req, res) => {
  try {
    const instituteid = req.session.affiliate.instituteid;
    console.log("Institute ID from session:", instituteid);

    const afpartners = await serviceHelpers.getAllAfPartnersW(instituteid);
    if (afpartners.length === 0) {
      return res.status(404).send("No affiliate partners found");
    }

    const affiliate = afpartners[0]; // Assuming you're interested in the first affiliate
    const wallet = affiliate.wallet || [];

    // Calculate the total raised amount
    const totalRaisedAmount = wallet
      .filter((entry) => entry.isRaised) // Filter raised entries
      .reduce((total, entry) => total + entry.amount, 0); // Sum the amounts

    // Calculate the total not raised amount
    const totalNotRaisedAmount = wallet
      .filter((entry) => !entry.isRaised) // Filter not raised entries
      .reduce((total, entry) => total + entry.amount, 0); // Sum the amounts

    // Calculate the total credited amount
    const totalCreditedAmount = wallet
      .filter((entry) => entry.isCredited) // Filter credited entries
      .reduce((total, entry) => total + entry.amount, 0); // Sum the amounts

    // Calculate the total pending amount
    const totalPendingAmount = wallet
      .filter((entry) => !entry.isCredited) // Filter pending entries
      .reduce((total, entry) => total + entry.amount, 0); // Sum the amounts

    console.log("Affiliate Wallet Data:", wallet);

    res.render("user/affiliate-partner-wallet", {
      user: true,
      affiliate: req.session.affiliate,
      institutename: affiliate.name, // Ensure this is passed to the template
      instituteid: affiliate.instituteid, // Additional fields passed
      company_type: affiliate.company_type,
      state: affiliate.state,
      city: affiliate.city,
      email: affiliate.email, // Passing email
      account_holder_name: affiliate.account_holder_name,
      account_number: affiliate.account_number,
      ifsc_code: affiliate.ifsc_code,
      branch: affiliate.branch,
      wallet, // Pass wallet data to template
      totalRaisedAmount, // Pass total raised amount to template
      totalNotRaisedAmount, // Pass total not raised amount to template
      totalCreditedAmount, // Pass total credited amount to template
      totalPendingAmount, // Pass total pending amount to template
    });
  } catch (error) {
    console.error("Error fetching affiliate wallet details:", error);
    res.status(500).send("Internal Server Error");
  }
});


// router.post("/update-wallet-status-bulk", async (req, res) => {
//   try {
//     const { indexes, isRaised } = req.body; // Get indexes and isRaised status from the request
//     const instituteid = req.session.affiliate.instituteid;
//     const currentDate = new Date(); // Get the current date and time

//     // Fetch the affiliate's wallet first to get the existing data
//     const affiliate = await db
//       .get()
//       .collection(collection.AFFILIATE_COLLECTION)
//       .findOne({ instituteid: instituteid });

//     if (!affiliate || !affiliate.wallet) {
//       return res
//         .status(404)
//         .json({
//           success: false,
//           message: "Affiliate not found or no wallet data",
//         });
//     }

//     const wallet = affiliate.wallet;

//     // Find the current highest raisedNumber in the wallet
//     let maxRaisedNumber = wallet.reduce((max, entry) => {
//       return entry.raisedNumber ? Math.max(max, entry.raisedNumber) : max;
//     }, 0);

//     // Create update queries to set 'isRaised', 'raisedAt', and assign sequential 'raisedNumber'
//     const updateQueries = indexes.map((index) => {
//       const walletFieldIsRaised = `wallet.${index}.isRaised`; // Path to the specific wallet entry
//       const raisedAtField = `wallet.${index}.raisedAt`; // Path to the raisedAt field
//       const raisedNumberField = `wallet.${index}.raisedNumber`; // Path to the raisedNumber field

//       let updateQuery = {
//         [walletFieldIsRaised]: isRaised,
//         [raisedAtField]: isRaised ? currentDate : null, // Set raisedAt only if isRaised is true
//       };

//       if (isRaised) {
//         maxRaisedNumber += 1; // Increment the raisedNumber for each raised item
//         updateQuery[raisedNumberField] = maxRaisedNumber; // Assign the new raised number
//       } else {
//         updateQuery[raisedNumberField] = null; // Reset raisedNumber if marking as not raised
//       }

//       return updateQuery;
//     });

//     // Combine all update queries into a single update operation
//     const updateOperation = updateQueries.reduce((acc, query) => {
//       return { ...acc, ...query };
//     }, {});

//     // Perform the update operation
//     const result = await db
//       .get()
//       .collection(collection.AFFILIATE_COLLECTION)
//       .updateOne(
//         { instituteid: instituteid }, // Find affiliate by instituteid
//         { $set: updateOperation } // Update isRaised, raisedAt, and raisedNumber for selected indexes
//       );

//     if (result.modifiedCount > 0) {
//       res.status(200).json({ success: true });
//     } else {
//       res
//         .status(400)
//         .json({ success: false, message: "Failed to update statuses" });
//     }
//   } catch (error) {
//     console.error("Error updating wallet status:", error);
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// });


router.post("/update-wallet-status-bulk", async (req, res) => {
  try {
    const { indexes } = req.body; // Get indexes from the request body
    const instituteid = req.session.affiliate.instituteid; // Get the institute ID from the session

    // Fetch affiliate data
    const affiliate = await db
      .get()
      .collection(collection.AFFILIATE_COLLECTION)
      .findOne({ instituteid: instituteid });

    if (!affiliate || !affiliate.wallet) {
      return res.status(404).json({
        success: false,
        message: "Affiliate not found or no wallet data",
      });
    }

    const wallet = affiliate.wallet || [];
    const currentDate = new Date();

    // Find the highest raised number and update lastRaisedNumber
    wallet.forEach((entry) => {
      if (entry.raisedNumber) {
        const numPart = parseInt(entry.raisedNumber, 10);
        if (numPart > lastRaisedNumber) {
          lastRaisedNumber = numPart;
        }
      }
    });

    // Increment the raised number
    const currentRaisedNumber = (lastRaisedNumber + 1)
      .toString()
      .padStart(5, "0");

    let totalRaisedAmount = 0;
    let raisedIndexes = [];

    // Update the wallet entries and calculate totals
    indexes.forEach((index) => {
      if (wallet[index] && !wallet[index].isRaised) {
        wallet[index].isRaised = true;
        wallet[index].raisedAt = currentDate;
        wallet[index].raisedNumber = currentRaisedNumber;
        raisedIndexes.push(index + 1);
        totalRaisedAmount += wallet[index].amount;
      }
    });

    // Save the updated wallet
    await db
      .get()
      .collection(collection.AFFILIATE_COLLECTION)
      .updateOne({ instituteid: instituteid }, { $set: { wallet: wallet } });

    // Update lastRaisedNumber for future invoices
    lastRaisedNumber = parseInt(currentRaisedNumber, 10);

    // Calculate taxes
    const subtotal = totalRaisedAmount;
    const cgst = subtotal * 0.09; // 9% CGST
    const sgst = subtotal * 0.09; // 9% SGST
    const igst = subtotal * 0.18; // 18% IGST
    const invoiceTotal = subtotal - igst;

    // Generate invoice number as a range from min to max raised numbers (e.g., "1-3")
    const invoiceNumber = `${Math.min(...raisedIndexes)}-${Math.max(
      ...raisedIndexes
    )}`;

    // Ensure the invoices directory exists
    const invoiceDir = path.join(__dirname, "../invoices");
    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir, { recursive: true });
    }

    // Path to store the PDF
    const pdfPath = path.join(invoiceDir, `invoice-${invoiceNumber}.pdf`);
    const writeStream = fs.createWriteStream(pdfPath);

    // Create a new PDF document
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    // Pipe the PDF output to the write stream
    doc.pipe(writeStream);

    // ---- Invoice Design ----
    // Header section
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Invoice", { align: "center" });

    // Header section continued
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(affiliate.name || "Sample Institute", 50, 120);

    doc
      .text(`Invoice No: ${currentRaisedNumber}`, 400, 120)
      .text(`Invoice Date: ${currentDate.toLocaleDateString()}`, 400, 135);

    // Bill To section
    doc.fontSize(10);
    doc.rect(50, 150, 250, 110).stroke();
    doc.text("Bill To:", 55, 155);
    doc.text("Indian Edu Hub Pvt Ltd.", 55, 170);
    doc.text('"Srinivasa Square", Horamavu Main Road,', 55, 185);
    doc.text("Banaswadi Road, Bengaluru-560043", 55, 200);
    doc.text("Karnataka", 55, 215);
    doc.text("GSTN: 29AAGCI0125F1ZW", 55, 230);
    doc.text("PAN: AAGCI10125F", 55, 245);

    // Reset the font size for other content
    doc.fontSize(12);

    // Right side invoice totals
    doc.rect(350, 150, 200, 110).stroke();
    doc.text("Invoice Subtotal", 355, 155);
    doc.text(`- ${subtotal.toFixed(2).toLocaleString("en-IN")}`, 480, 155);
    doc.text("CGST @ 9%", 355, 170);
    doc.text(`- ${cgst.toFixed(2).toLocaleString("en-IN")}`, 480, 170);
    doc.text("SGST @ 9%", 355, 185);
    doc.text(`- ${sgst.toFixed(2).toLocaleString("en-IN")}`, 480, 185);
    doc.text("IGST @ 18%", 355, 200);
    doc.text(`- ${igst.toFixed(2).toLocaleString("en-IN")}`, 480, 200);
    doc.text("Invoice Total", 355, 215);
    doc.text(`- ${invoiceTotal.toFixed(2).toLocaleString("en-IN")}`, 480, 215);

    // Services Table Header
    doc.rect(50, 290, 500, 20).fillAndStroke("#f0f0f0", "black");
    doc.fill("black").fontSize(10).text("Description", 55, 295);
    doc.text("Amount", 470, 295);

    // Add subtotal amount for all services
    const marketingServiceDescription = "Marketing Services";
    const totalAmount = subtotal.toLocaleString("en-IN");

    let yPos = 315;
    doc.text(marketingServiceDescription, 55, yPos);
    doc.text(`- ${totalAmount}`, 470, yPos);
    yPos += 20;

    // Total Amount at the end
    doc.rect(350, yPos + 20, 200, 40).stroke();
    doc.text("Total", 355, yPos + 25);
    doc.text(
      `- ${invoiceTotal.toFixed(2).toLocaleString("en-IN")}`,
      480,
      yPos + 25
    );

    // Footer section with bank details and dynamic affiliate name
    // Fetch affiliate details dynamically from the session or the database
    const branch = affiliate.branch || " Not Available";
    const accountName = affiliate.account_holder_name || " Not Available";
    const accountNumber = affiliate.account_number || " Not Available";
    const ifscCode = affiliate.ifsc_code || " Not Available";

    // Dynamic footer section with bank details
    doc
      .fontSize(10)
      .text(`For ${affiliate.name || "Sample Institute"}`, 50, yPos + 80)
      .text("Authorized Signatory", 50, yPos + 100)
      .text(`Branch: ${branch}`, 350, yPos + 80)
      .text(`Account Name: ${accountName}`, 350, yPos + 95)
      .text(`Account Number: ${accountNumber}`, 350, yPos + 110)
      .text(`IFSC Code: ${ifscCode}`, 350, yPos + 125);

    // End the document and finish writing the PDF
    doc.end();

    // Once the PDF is fully written, trigger the download
    writeStream.on("finish", () => {
      res.setHeader(
        "Content-disposition",
        `attachment; filename=invoice-${invoiceNumber}.pdf`
      );
      res.setHeader("Content-type", "application/pdf");

      // Read the file and send it to the client
      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(res);

      // Optional: Remove the file after sending it
      fileStream.on("end", () => {
        fs.unlinkSync(pdfPath); // Remove the file after it's downloaded
      });
    });
  } catch (error) {
    console.error("Error updating wallet status or generating invoice:", error);
    res
      .status(500)
      .json({ message: "Error updating wallet status or generating invoice" });
  }
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
  const instituteid = req.session.affiliate.instituteid; // Get the instituteid from session

  serviceHelpers
    .getAllPatnerTrack(instituteid)
    .then((referredBy) => {
      // Filter the referredBy array to only include entries with "Assigned to accounts department"
      const filteredReferredBy = referredBy.filter(
        (entry) => entry.assignaccounts === "Assigned to accounts department"
      );

      // Render the view with the filtered data
      res.render("user/affiliate-partner-payout-track", {
       user: true,affiliate: req.session.affiliate,
        referredBy: filteredReferredBy, // Pass the filtered data to the view
      });
    })
    .catch((error) => {
      console.error("Error fetching referral details:", error);
      res
        .status(500)
        .send("An error occurred while fetching referral details.");
    });
});


router.get("/affiliate-partner-referral-details", verifyAffiliate, (req, res) => {
  const instituteid = req.session.affiliate.instituteid; // Get the instituteid from session

  console.log("Institute ID from session:", instituteid);

  // Fetch both referral and referredBy data
  Promise.all([
    serviceHelpers.getAllPatnerReferral(instituteid),
    serviceHelpers.getAllPatnerTrack(instituteid) // This returns `referredBy`
  ])
    .then(([referral, referredBy]) => {
      // Log the received data to inspect their structure
      console.log("Referral Data:", JSON.stringify(referral, null, 2));
      console.log("ReferredBy Data:", JSON.stringify(referredBy, null, 2));

      // Map over referral data to add matching status based on referredBy data
      referral = referral.map((ref) => {
        const refEmail = ref.email.trim().toLowerCase(); // Normalize referral email

        // Log the current referral email being processed
        console.log(`Processing referral with email: ${refEmail}`);

        const match = referredBy.find(
          (rb) => rb.email.trim().toLowerCase() === refEmail && rb.referredBy === instituteid
        );

        // Log whether a match was found
        if (match) {
          console.log(`Match found for email: ${ref.email}`);
        } else {
          console.log(`No match found for email: ${ref.email}`);
        }

        // Add the leadStageStatus based on the match
        ref.leadStageStatus = match ? "✔" : "✘"; // Mark as 'tick' or 'wrong'
        return ref;
      });

      // Render the view with the modified referral data
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

router.get("/partner-wallet", verifyPartner, async (req, res) => {
  try {
    const instituteid = req.session.partner.instituteid;
    const partners = await serviceHelpers.getAllPartnersW(instituteid);

    if (partners.length === 0) {
      return res.status(404).send("No partners found");
    }

    const partner = partners[0]; // Assuming first partner is the one we need
    const wallet = partner.wallet || [];

    // Calculate total amounts (raised, not raised, etc.)
    const totalRaisedAmount = wallet
      .filter((entry) => entry.isRaised)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const totalNotRaisedAmount = wallet
      .filter((entry) => !entry.isRaised)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const totalCreditedAmount = wallet
      .filter((entry) => entry.isCredited)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const totalPendingAmount = wallet
      .filter((entry) => !entry.isCredited)
      .reduce((sum, entry) => sum + entry.amount, 0);

    // Pass the data to the template
    res.render("user/partner-wallet", {
      partner: req.session.partner,
      institutename: partner.institutename, // Ensure this is passed to the template
      instituteid: partner.instituteid, // Additional fields passed
      owner_name: partner.owner_name,
      company_type: partner.company_type,
      state: partner.state,
      city: partner.city,
      email: partner.email, // Passing email
      account_holder_name: partner.account_holder_name,
      account_number: partner.account_number,
      ifsc_code: partner.ifsc_code,
      branch: partner.branch,
      wallet,
      totalRaisedAmount,
      totalNotRaisedAmount,
      totalCreditedAmount,
      totalPendingAmount,
      currentDate: new Date(),
    });
  } catch (error) {
    console.error("Error fetching wallet details:", error);
    res.status(500).send("Internal Server Error");
  }
});






// Starting point for lastRaisedNumber (store this value persistently, e.g., in a database)
let lastRaisedNumber = 515; 

router.post('/update-wallet-status-bulk-p', verifyPartner, async (req, res) => {
  try {
    const instituteid = req.session.partner.instituteid;
    const { indexes } = req.body;

    // Fetch partner data
    const partners = await serviceHelpers.getAllPartnersW(instituteid);
    if (partners.length === 0) {
      return res.status(404).send("No partners found");
    }

    const partner = partners[0];
    const wallet = partner.wallet || [];
    const currentDate = new Date();

    // Find the highest raised number and update lastRaisedNumber
    wallet.forEach((entry) => {
      if (entry.raisedNumber) {
        const numPart = parseInt(entry.raisedNumber, 10);
        if (numPart > lastRaisedNumber) {
          lastRaisedNumber = numPart;
        }
      }
    });

    // Increment the raised number
    const currentRaisedNumber = (lastRaisedNumber + 1)
      .toString()
      .padStart(5, "0");

    let totalRaisedAmount = 0;
    let raisedIndexes = [];

    // Update the wallet entries and calculate totals
    indexes.forEach((index) => {
      if (wallet[index] && !wallet[index].isRaised) {
        wallet[index].isRaised = true;
        wallet[index].raisedAt = currentDate;
        wallet[index].raisedNumber = currentRaisedNumber;
        raisedIndexes.push(index + 1);
        totalRaisedAmount += wallet[index].amount;
      }
    });

    // Save the updated wallet
    await serviceHelpers.updatePartnerWallet(instituteid, wallet);

    // Update lastRaisedNumber for future invoices
    lastRaisedNumber = parseInt(currentRaisedNumber, 10);

    // Calculate taxes
    const subtotal = totalRaisedAmount;
    const cgst = subtotal * 0.09; // 9% CGST
    const sgst = subtotal * 0.09; // 9% SGST
    const igst = subtotal * 0.18; // 18% IGST
    const invoiceTotal = subtotal - igst;
    // Calculate taxes

    // Generate invoice number as a range from min to max raised numbers (e.g., "1-3")
    const invoiceNumber = `${Math.min(...raisedIndexes)}-${Math.max(
      ...raisedIndexes
    )}`;

    // Ensure the invoices directory exists
    const invoiceDir = path.join(__dirname, "../invoices");
    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir, { recursive: true });
    }

    // Path to store the PDF
    const pdfPath = path.join(invoiceDir, `invoice-${invoiceNumber}.pdf`);
    const writeStream = fs.createWriteStream(pdfPath);

    // Create a new PDF document
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    // Pipe the PDF output to the write stream
    doc.pipe(writeStream);

    // ---- Invoice Design ----
    // Header section
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Invoice", { align: "center" });

    // Header section continued
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(partner.institutename || "Sample Institute", 50, 120);

    doc
      .text(`Invoice No: ${currentRaisedNumber}`, 400, 120)
      .text(`Invoice Date: ${currentDate.toLocaleDateString()}`, 400, 135);

    // Bill To section
    doc.fontSize(10);
    doc.rect(50, 150, 250, 110).stroke();
    doc.text("Bill To:", 55, 155);
    doc.text("Indian Edu Hub Pvt Ltd.", 55, 170);
    doc.text('"Srinivasa Square", Horamavu Main Road,', 55, 185);
    doc.text("Banaswadi Road, Bengaluru-560043", 55, 200);
    doc.text("Karnataka", 55, 215);
    doc.text("GSTN: 29AAGCI0125F1ZW", 55, 230);
    doc.text("PAN: AAGCI10125F", 55, 245);

    // Reset the font size for other content
    doc.fontSize(12);

    // Right side invoice totals
    doc.rect(350, 150, 200, 110).stroke();
    doc.text("Invoice Subtotal", 355, 155);
    doc.text(`- ${subtotal.toFixed(2).toLocaleString("en-IN")}`, 480, 155);
    doc.text("CGST @ 9%", 355, 170);
    doc.text(`- ${cgst.toFixed(2).toLocaleString("en-IN")}`, 480, 170);
    doc.text("SGST @ 9%", 355, 185);
    doc.text(`- ${sgst.toFixed(2).toLocaleString("en-IN")}`, 480, 185);
    doc.text("IGST @ 18%", 355, 200);
    doc.text(`- ${igst.toFixed(2).toLocaleString("en-IN")}`, 480, 200);
    doc.text("Invoice Total", 355, 215);
    doc.text(`- ${invoiceTotal.toFixed(2).toLocaleString("en-IN")}`, 480, 215);

    // Services Table Header
    doc.rect(50, 290, 500, 20).fillAndStroke("#f0f0f0", "black");
    doc.fill("black").fontSize(10).text("Description", 55, 295);
    doc.text("Amount", 470, 295);

    // Add subtotal amount for all services
    const marketingServiceDescription = "Marketing Services";
    const totalAmount = subtotal.toLocaleString("en-IN");

    let yPos = 315;
    doc.text(marketingServiceDescription, 55, yPos);
    doc.text(`- ${totalAmount}`, 470, yPos);
    yPos += 20;

    // Total Amount at the end
    doc.rect(350, yPos + 20, 200, 40).stroke();
    doc.text("Total", 355, yPos + 25);
    doc.text(
      `- ${invoiceTotal.toFixed(2).toLocaleString("en-IN")}`,
      480,
      yPos + 25
    );

    // Fetch affiliate details dynamically from the session or the database
    const branch = partner.branch || " Not Available";
    const accountName = partner.account_holder_name || " Not Available";
    const accountNumber =
      partner.account_number || " Not Available";
    const ifscCode = partner.ifsc_code || " Not Available";

    // Dynamic footer section with bank details
    doc
      .fontSize(10)
      .text(
        `For ${partner.institutename || "Sample Institute"}`,
        50,
        yPos + 80
      )
      .text("Authorized Signatory", 50, yPos + 100)
      .text(`Branch: ${branch}`, 350, yPos + 80)
      .text(`Account Name: ${accountName}`, 350, yPos + 95)
      .text(`Account Number: ${accountNumber}`, 350, yPos + 110)
      .text(`IFSC Code: ${ifscCode}`, 350, yPos + 125);

    // End the document and finish writing the PDF
    doc.end();

    // Once the PDF is fully written, trigger the download
    writeStream.on("finish", () => {
      res.setHeader(
        "Content-disposition",
        `attachment; filename=invoice-${invoiceNumber}.pdf`
      );
      res.setHeader("Content-type", "application/pdf");

      // Read the file and send it to the client
      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(res);

      // Optional: Remove the file after sending it
      fileStream.on("end", () => {
        fs.unlinkSync(pdfPath); // Remove the file after it's downloaded
      });
    });
  } catch (error) {
    console.error('Error updating wallet status or generating invoice:', error);
    res.status(500).json({ message: 'Error updating wallet status or generating invoice' });
  }
});


// router.post("/generate-invoice-pdf", verifyPartner, async (req, res) => {
//   try {
//     const instituteid = req.session.partner.instituteid;
//     const { indexes } = req.body;

//     // Find the partner by instituteid
//     const partners = await serviceHelpers.getAllPartnersW(instituteid);
//     if (partners.length === 0) {
//       return res.status(404).send("No partners found");
//     }

//     const partner = partners[0];
//     const wallet = partner.wallet || [];
//     const currentDate = new Date(); // Get the current date and time

//     let totalRaisedAmount = 0;
//     let raisedNumbers = [];

//     // Determine the raised number for the current request
//     const currentRaisedNumber = (lastRaisedNumber + 1)
//       .toString()
//       .padStart(5, "0");

//     // Update the 'isRaised' field, store the date, and calculate total amount
//     indexes.forEach((index) => {
//       if (wallet[index]) {
//         wallet[index].isRaised = true;
//         wallet[index].raisedAt = currentDate; // Store the current date and time
//         wallet[index].raisedNumber = currentRaisedNumber; // Assign the same raised number
//         raisedNumbers.push(index + 1); // Store raised number (index starts at 0, so add 1)
//         totalRaisedAmount += wallet[index].amount; // Sum the raised amount
//       }
//     });

//     // Calculate taxes
//     const subtotal = totalRaisedAmount;
//     const cgst = subtotal * 0.09; // 9% CGST
//     const sgst = subtotal * 0.09; // 9% SGST
//     const igst = subtotal * 0.18; // 18% IGST

//     // Calculate invoice total
//     const invoiceTotal = subtotal - igst;

//     // Generate invoice number as a range from min to max raised numbers (e.g., "1-3")
//     const invoiceNumber = `${Math.min(...raisedNumbers)}-${Math.max(
//       ...raisedNumbers
//     )}`;

//     // Ensure the invoices directory exists
//     const invoiceDir = path.join(__dirname, "../invoices");
//     if (!fs.existsSync(invoiceDir)) {
//       fs.mkdirSync(invoiceDir, { recursive: true }); // Create directory if it doesn't exist
//     }

//     // Path to store the PDF
//     const pdfPath = path.join(invoiceDir, `invoice-${invoiceNumber}.pdf`);
//     const writeStream = fs.createWriteStream(pdfPath);

//     // Create a new PDF document
//     const doc = new PDFDocument({
//       size: "A4",
//       margin: 50,
//     });

//     // Pipe the PDF output to the write stream
//     doc.pipe(writeStream);

//     // ---- Invoice Design ----
//     // Header section
//     doc
//       .fontSize(12)
//       .font("Helvetica-Bold") // Set bold font
//       .text("Invoice", 0, 90, { align: "center" }); // Center alignment

//     // Header section continued
//     doc
//       .fontSize(12)
//       .font("Helvetica") // Reset to normal font
//       .text(partner.institutename || "Sample Institute", 50, 120);

//     doc
//       .text(
//         `Invoice No: ${currentRaisedNumber}`,
//         400,
//         120
//       )
//       .text(`Invoice Date: ${currentDate.toLocaleDateString()}`, 400, 135);

//     // Bill To section (static with smaller font)
//     doc.fontSize(10); // Set smaller font for this section
//     doc.rect(50, 150, 250, 110).stroke();
//     doc.text("Bill To:", 55, 155); // Always show "Bill To:"
//     doc.text("Indian Edu Hub Pvt Ltd.", 55, 170); // Adjusted Y position
//     doc.text('"Srinivasa Square", Horamavu Main Road,', 55, 185); // Adjusted Y position
//     doc.text("Banaswadi Road, Bengaluru-560043", 55, 200); // Adjusted Y position
//     doc.text("Karnataka", 55, 215); // Adjusted Y position
//     doc.text("GSTN: 29AAGCI0125F1ZW", 55, 230); // Adjusted Y position
//     doc.text("PAN: AAGCI10125F", 55, 245); // Adjusted Y position

//     // Reset the font size for other content
//     doc.fontSize(12);

//     // Right side invoice totals
//     doc.rect(350, 150, 200, 110).stroke();
//     doc.text("Invoice Subtotal", 355, 155);
//     doc.text(`- ${subtotal.toFixed(2).toLocaleString("en-IN")}`, 480, 155);
//     doc.text("CGST @ 9%", 355, 170);
//     doc.text(`- ${cgst.toFixed(2).toLocaleString("en-IN")}`, 480, 170);
//     doc.text("SGST @ 9%", 355, 185);
//     doc.text(`- ${sgst.toFixed(2).toLocaleString("en-IN")}`, 480, 185);
//     doc.text("IGST @ 18%", 355, 200);
//     doc.text(`- ${igst.toFixed(2).toLocaleString("en-IN")}`, 480, 200);
//     doc.text("Invoice Total", 355, 215);
//     doc.text(`- ${invoiceTotal.toFixed(2).toLocaleString("en-IN")}`, 480, 215);

//     // Services Table Header
//     doc.rect(50, 290, 500, 20).fillAndStroke("#f0f0f0", "black");
//     doc.fill("black").fontSize(10).text("Description", 55, 295);
//     doc.text("Amount", 470, 295);

//     // Table content (each row)
//     let yPos = 315;
//     indexes.forEach((index) => {
//       const entry = wallet[index];
//       doc.text("Marketing Services", 55, yPos);
//       doc.text(`- ${entry.subtotal.toLocaleString("en-IN")}`, 470, yPos);
//       yPos += 20;
//     });

//     // Total Amount at the end
//     doc.rect(350, yPos + 20, 200, 40).stroke();
//     doc.text("Total", 355, yPos + 25);
//     doc.text(
//       `-  ${invoiceTotal.toFixed(2).toLocaleString("en-IN")}`,
//       480,
//       yPos + 25
//     );

//     // Footer section with bank details and dynamic institute name
//     doc
//       .fontSize(10)
//       .text(`For ${partner.institutename || "Sample Institute"}`, 50, yPos + 80) // Dynamic institutename
//       .text("Authorized Signatory", 50, yPos + 100)
//       .text("Branch: XYZ Branch", 350, yPos + 80) // Static Branch
//       .text("Account Name: Sample", 350, yPos + 95) // Static Account Name
//       .text("Account Number: 0909090909090", 350, yPos + 110) // Static Account Number
//       .text("IFSC Code: Sample123", 350, yPos + 125); // Static IFSC Code

//     // End the document and finish writing the PDF
//     doc.end();

//     // Once the PDF is fully written, trigger the download
//     writeStream.on("finish", () => {
//       res.setHeader(
//         "Content-disposition",
//         `attachment; filename=invoice-${invoiceNumber}.pdf`
//       );
//       res.setHeader("Content-type", "application/pdf");

//       // Read the file and send it to the client
//       const fileStream = fs.createReadStream(pdfPath);
//       fileStream.pipe(res);

//       // Optional: Remove the file after sending it
//       fileStream.on("end", () => {
//         fs.unlinkSync(pdfPath); // Remove the file after it's downloaded
//       });
//     });

//     // Update lastRaisedNumber for next use
//     lastRaisedNumber = parseInt(currentRaisedNumber, 10);
//   } catch (error) {
//     console.error("Error generating invoice:", error);
//     res.status(500).json({ message: "Error generating invoice" });
//   }
// });


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

    // Fetch wallet details for the partner
    const partners = await serviceHelpers.getAllPartnersW(instituteid);
    if (partners.length === 0) {
      return res.status(404).send("No partners found");
    }

    const partner = partners[0]; // Assuming you're interested in the first partner
    const wallet = partner.wallet || [];

    // Calculate the total credited amount
    const totalCreditedAmount = wallet
      .filter((entry) => entry.isCredited) // Filter credited entries
      .reduce((total, entry) => total + entry.amount, 0); // Sum the amounts

    // Calculate the total pending amount
    const totalPendingAmount = wallet
      .filter((entry) => !entry.isCredited) // Filter pending entries
      .reduce((total, entry) => total + entry.amount, 0); // Sum the amounts

    // Get the referred by count
    const referredByCount = await serviceHelpers.getUniqueReferredByCount(
      instituteid
    );
    console.log("ReferredBy Count from Helper:", referredByCount);

    // Fetch students or data that contains `idApproved` field
    const referredBy = await serviceHelpers.getAllPatnerTrack(instituteid);

    // Log the `referredBy` data to inspect the actual data
    console.log("ReferredBy Data:", referredBy);

    // Calculate the not approved count
    // Calculate the not approved count
    const notApprovedCount = referredBy.filter(
      (student) =>
        !student.idApproved || student.idApproved.trim() !== "Approved"
    ).length;
    console.log("Not Approved Count:", notApprovedCount); // Should output the correct count based on the actual data

    // Render the dashboard and pass the amounts
    res.render("user/partner-dashboard", {
      partner: req.session.partner,
      referredByCount: referredByCount,
      totalCreditedAmount, // Pass total credited amount to the template
      totalPendingAmount, // Pass total pending amount to the template
      notApprovedCount, // Pass the not approved count to the template
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
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
      // Filter the referredBy array to only include entries with "Assigned to accounts department"
      const filteredReferredBy = referredBy.filter(
        (entry) => entry.assignaccounts === "Assigned to accounts department"
      );

      // Render the view with the filtered data
      res.render("user/partner-payout-track", {
        admin: true,
        referredBy: filteredReferredBy, // Pass the filtered data to the view
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

    const result = await serviceHelpers.createPartner({
      email,
      ...otherFields,
    });

    // Ensure the email is valid before sending
    if (result.success) {
      // Send email with login details upon successful creation
      const transporter = nodemailer.createTransport({
        service: "Gmail", // or use your email service provider
        auth: {
          user: "clientsupport@indianeduhub.com",
          pass: "xeep ypij nhqg ilcd",
        },
      });

      const mailOptions = {
        from: "clientsupport@indianeduhub.com",
        to: email, // Ensure this is populated
        subject: "Partner Account Created",
        html: `
     <p>Dear ${otherFields.owner_name},</p>

<p>Welcome to the Indian Edu Hub family! We are excited to have you on board as one of our valued Partner. Your partnership is integral to our mission of making education more accessible to all.</p>

<p>Below are your login details to access your Partner Dashboard, where you can track your performance, earnings, and much more:</p>

<ul>
  <li><strong>Email:</strong> ${email}</li>
  <li><strong>Password:</strong> ${otherFields.password}</li>
</ul>

<p>You can get started by clicking the link below:</p>

<p style="text-align: center;">
  <a 
    href="https://crm.indianeduhub.in/partner-signup" 
    style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">
    Log In to Your Partner Dashboard
  </a>
</p>

<p>If you have any questions or need assistance, feel free to reach out to our support team. We're here to help you succeed!</p>

<p>We look forward to a long and prosperous partnership together.</p>

<p>Best regards,<br><strong>The Indian Edu Hub Team</strong></p>

<p style="font-size: 12px; color: gray;">This email contains confidential information intended solely for ${otherFields.owner_name}. If you are not the intended recipient, please notify the sender and delete this email immediately.</p>

    `,
      };

      // Send email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });

      res.status(200).json({ success: true });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error("Error creating partner:", error);
    res.status(500).json({ message: "Internal Server Error: " + error.message });
  }
});





// Custom 404 Page
router.use((req, res) => {
  res.status(404).render("user/404", { user: true });
});

module.exports = router;
