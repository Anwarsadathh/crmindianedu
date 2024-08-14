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

// Configure the transporter
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "clientsupport@indianeduhub.com",
    pass: "xeep ypij nhqg ilcd",
  },
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

router.get("/accounts", (req, res) => {
  res.render("user/accounts-login", { user: true });
});

router.get("/crm-tl-dashboard", (req, res) => {
  res.render("user/crm-tl-dashboard", { user: true });
});

router.get("/crm-tl-details", async (req, res) => {
  try {
    // Fetch data from both collections
    const googlesheets = await serviceHelpers.getAllGooglsheets();
    const referrals = await serviceHelpers.getAllReferral(); // Assuming this is the function to get data from REFERRAL_COLLECTION

    // Exclude the first item from the googlesheets array
    const filteredGooglesheets = googlesheets
      .slice(1)
      .map((item) => ({ ...item, source: item.source || "N/A" })); // Handle missing source values
    const referralsWithSource = referrals.map((item) => ({
      ...item,
      source: item.source || "N/A", // Handle missing source values
    }));

    // Combine data as needed
    const combinedData = [...filteredGooglesheets, ...referralsWithSource];

    // Fetch lead owners
    const leadOwners = await serviceHelpers.getAllLeadOwners();

    // Log the combined data to the console (for debugging purposes)
    console.log(combinedData);

    // Render the view with the combined data
    res.render("user/crm-tl-details", {
      admin: true,
      googlesheets: combinedData,
      leadOwners,
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
  const { id, leadOwnerName, assignLead, leadStatus } = req.body;

  try {
    // Check if the ID is valid
    if (!id || typeof id !== "string") {
      console.error("Invalid ID format:", id);
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID format." });
    }

    // Ensure leadStatus is either a valid object or an empty object
    const leadStatusObject =
      leadStatus && typeof leadStatus === "object" ? leadStatus : {};

    await serviceHelpers.updateLeadOwner(
      id,
      leadOwnerName,
      assignLead,
      leadStatusObject // Pass leadStatusObject to the helper
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating lead owner:", error);
    res.json({
      success: false,
      message: "An error occurred while updating the lead owner.",
    });
  }
});





// router.js or similar file
router.post("/update-lead-status", async (req, res) => {
  const { id, leadStage, leadStatus, isSaved } = req.body;

  try {
    if (!id || typeof id !== "string") {
      console.error("Invalid ID format:", id);
      return res.status(400).json({ success: false, message: "Invalid ID format." });
    }

    // Use the helper function to update lead status
    await serviceHelpers.updateLeadStatus(id, leadStage, leadStatus, isSaved);

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating lead status:", error);
    res.json({ success: false, message: "An error occurred while updating the lead status." });
  }
});


router.post("/get-lead-status", async (req, res) => {
  const { id, leadStage } = req.body;

  try {
    // Validate the ID format
    if (!id || typeof id !== "string") {
      console.error("Invalid ID format:", id);
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID format." });
    }

    // Retrieve the lead status
    const status = await serviceHelpers.getLeadStatus(id, leadStage);
    res.json({ success: true, status });
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

router.get("/crm-lead-owner-dashboard",verifyLogin, (req, res) => {
  res.render("user/crmleadowners-dash", { user: true });
});

router.get("/crm-lead-owner-details", async (req, res) => {
  // Check if the user is logged in
  if (!req.session.user) {
    return res.redirect("/lead-login");
  }

  const leadOwnerName = req.session.user.email;

  try {
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

    // Log the filtered data to the console (for debugging purposes)
    console.log(filteredData);

    // Render the view with the filtered data
    res.render("user/crmleadowners-details", {
      admin: true,
      googlesheets: filteredData,
      leadOwners,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
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
  const validIdPattern = /^IEH\d+$/; // Adjust this pattern based on your ID format

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

router.get("/accounts-details", (req, res) => {
  serviceHelpers
    .getAllAccountsdashboard()
    .then((formData) => {
      console.log(formData);

      res.render("user/accounts-details", {
        admin: true,
        formData,
      });
    })
    .catch((error) => {
      console.error("Error fetching client details:", error);
      res.status(500).send("An error occurred while fetching client details.");
    });
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
            .json({ success: false, message: "Failed to insert client" });
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
      city
    } = req.body;

    // Build the updateFields object with only the provided fields
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (scholarship !== undefined) updateFields.scholarship = scholarship;
    if (state !== undefined) updateFields.state = state;
     if (city !== undefined) updateFields.city = city;
    if (course !== undefined) updateFields.course = course;
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

    // Ensure the id is provided and valid
    if (!id) {
      return res.status(400).json({ message: "Client ID is required" });
    }

    const result = await serviceHelpers.updateClientDetails(id, updateFields);

    // Send a success response with the result
    res.json(result);
  } catch (error) {
    // Send an error response with the error message
    res.status(500).json({ message: error.message });
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
       institute_place: result.partner.institute_place,
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

router.get("/affiliate-partner-client-track", verifyAffiliate, (req, res) => {
  res.render("user/partner-client-track", { user: true,affiliate: req.session.affiliate });
});

router.get("/affiliate-partner-referral-details", verifyAffiliate, (req, res) => {
  const instituteid = req.session.affiliate.instituteid; // Get the instituteid from session

  serviceHelpers
    .getAllPatnerReferral(instituteid)
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

router.get("/partner-payout-track", verifyPartner, (req, res) => {
  res.render("user/partner-payout-track", { user: true });
});

router.get("/partner-creation",  (req, res) => {
  res.render("user/partner-creating", { user: false, layout: false });
});

router.post("/partner-creation", async (req, res) => {
  try {
    console.log(req.body); // Log the request body to debug

    // Extract necessary fields from request body
    const { email, otp, ...otherFields } = req.body;

    // Assuming OTP verification is handled in the /verify-otp route,
    // you might want to validate the OTP here as needed or rely on
    // external logic if OTP verification is done elsewhere.

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
