const { ObjectId } = require("mongodb");
const collection = require("../config/collection");
const db = require("../config/connection");
const bcrypt = require("bcrypt");
const saltRounds = 10; // Define saltRounds
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bodyParser = require("body-parser");


module.exports = {
  getAllClient: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let client = await db
          .get()
          .collection(collection.CLIENT_COLLECTION)
          .find()
          .toArray();
        resolve(client);
      } catch (error) {
        reject(error);
      }
    });
  },
  getAllLeadOwners: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let leadOwners = await db
          .get()
          .collection(collection.CRM_LEAD_COLLECTION)
          .find()
          .toArray();
        resolve(leadOwners);
      } catch (error) {
        reject(error);
      }
    });
  },
  getSubStagesFromDatabase: (stage) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!stage || typeof stage !== "string") {
          return reject({ message: "Invalid stage value." });
        }

        // Retrieve the stage document
        const stageDocument = await db
          .get()
          .collection(collection.LEADSTAGE_COLLECTION)
          .findOne({ stage });

        // If stage document exists, return the sub-stages
        if (stageDocument && stageDocument.substage) {
          resolve(stageDocument.substage);
        } else {
          resolve([]); // No sub-stages available for the given stage
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  getAllLeadStage: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let leadStage = await db
          .get()
          .collection(collection.LEADSTAGE_COLLECTION)
          .find()
          .toArray();
        resolve(leadStage);
      } catch (error) {
        reject(error);
      }
    });
  },
  createLeadStage: (leadStageData) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if the stage already exists
        const existingLeadStage = await db
          .get()
          .collection(collection.LEADSTAGE_COLLECTION)
          .findOne({ stage: leadStageData.stage });

        if (existingLeadStage) {
          return reject({ message: "Lead Stage already exists" });
        }

        // Save the lead stage details into the database
        await db
          .get()
          .collection(collection.LEADSTAGE_COLLECTION)
          .insertOne(leadStageData);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  getFilteredGooglsheets: (filterCriteria) => {
    return new Promise(async (resolve, reject) => {
      try {
        let googlsheets = await db
          .get()
          .collection(collection.GOOGLESHEETS_COLLECTION)
          .find(filterCriteria)
          .toArray();
        resolve(googlsheets);
      } catch (error) {
        reject(error);
      }
    });
  },

  getFilteredReferrals: (filterCriteria) => {
    return new Promise(async (resolve, reject) => {
      try {
        let referrals = await db
          .get()
          .collection(collection.REFERRAL_COLLECTION)
          .find(filterCriteria)
          .toArray();
        resolve(referrals);
      } catch (error) {
        reject(error);
      }
    });
  },

  scratchReward: (rewardId) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Assuming you have a collection for rewards and the reward needs to be updated
        const result = await db
          .get()
          .collection(collection.CRM_LEAD_COLLECTION)
          .updateOne(
            { "rewards._id": rewardId },
            {
              $set: { "rewards.$.scratched": true },
            }
          );

        if (result.modifiedCount > 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false });
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  getLeadOwnerByEmail: (email) => {
    return new Promise(async (resolve, reject) => {
      try {
        const leadOwner = await db
          .get()
          .collection(collection.CRM_LEAD_COLLECTION)
          .findOne({ email });
        resolve(leadOwner);
      } catch (error) {
        reject(error);
      }
    });
  },

  updateLeadOwnerref: (leadOwnerEmail, referralData) => {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await db
          .get()
          .collection(collection.CRM_LEAD_COLLECTION)
          .updateOne(
            { email: leadOwnerEmail },
            {
              $push: { rewards: referralData }, // Add referral data to the array
            }
          );

        if (result.matchedCount === 0) {
          // Document not found
          throw new Error(`Document with email ${leadOwnerEmail} not found.`);
        }

        resolve();
      } catch (error) {
        console.error("Error in updateLeadOwnerref:", error);
        reject(error);
      }
    });
  },
  updateLeadOwnerrefSc: (leadOwnerEmail, referralData) => {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await db
          .get()
          .collection(collection.CRM_LEAD_COLLECTION)
          .updateOne(
            { email: leadOwnerEmail, "rewards.title": referralData.title },
            {
              $set: { "rewards.$.scratch": referralData.scratch }, // Update the scratch status of the matching reward
            }
          );

        if (result.matchedCount === 0) {
          // Document or reward not found
          throw new Error(
            `Reward with title ${referralData.title} not found for email ${leadOwnerEmail}.`
          );
        }

        resolve();
      } catch (error) {
        console.error("Error in updateLeadOwnerref:", error);
        reject(error);
      }
    });
  },

  createLeadOwner: (leadOwnerData) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if the email already exists
        const existingLeadOwner = await db
          .get()
          .collection(collection.CRM_LEAD_COLLECTION)
          .findOne({ email: leadOwnerData.email });

        if (existingLeadOwner) {
          return reject({ message: "Email already exists" });
        }

        // Encrypt the password
        const hashedPassword = await bcrypt.hash(leadOwnerData.password, 10);
        leadOwnerData.password = hashedPassword;

        // Save the lead owner details into the database
        await db
          .get()
          .collection(collection.CRM_LEAD_COLLECTION)
          .insertOne(leadOwnerData);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },
  getLeadStatusCounts: (sessionEmail, startDate, endDate) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log("Lead Owner Email for Count:", sessionEmail);
        console.log("Received startDate:", startDate);
        console.log("Received endDate:", endDate);

        // Convert startDate and endDate to ISO strings (dates only)
        const start = startDate
          ? new Date(startDate).toISOString().split("T")[0]
          : null;
        const end = endDate
          ? new Date(endDate).toISOString().split("T")[0]
          : null;

        console.log("Parsed startDate:", start);
        console.log("Parsed endDate:", end);

        let matchCriteria = { leadOwnerName: sessionEmail };

        // Date range filter for leadStatus
        const dateMatch =
          start && end
            ? {
                $match: {
                  "leadStatusArray.v.date": { $gte: start, $lte: end },
                },
              }
            : { $match: {} }; // Avoid an empty match object

        // Google Sheets Collection aggregation for lead status counts
        const googleSheetsCounts = await db
          .get()
          .collection(collection.GOOGLESHEETS_COLLECTION)
          .aggregate([
            { $match: matchCriteria },
            {
              $project: {
                leadStatusArray: {
                  $objectToArray: "$leadStatus",
                },
              },
            },
            { $unwind: "$leadStatusArray" },
            dateMatch, // Apply date filter only if startDate and endDate are provided
            {
              $group: {
                _id: "$leadStatusArray.k",
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        // Referral Collection aggregation for lead status counts
        const referralCounts = await db
          .get()
          .collection(collection.REFERRAL_COLLECTION)
          .aggregate([
            { $match: matchCriteria },
            {
              $project: {
                leadStatusArray: {
                  $objectToArray: "$leadStatus",
                },
              },
            },
            { $unwind: "$leadStatusArray" },
            dateMatch, // Apply date filter only if startDate and endDate are provided
            {
              $group: {
                _id: "$leadStatusArray.k",
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        // Combine and normalize counts for lead statuses
        const combinedCounts = [
          ...googleSheetsCounts,
          ...referralCounts,
        ].reduce((acc, curr) => {
          const status = curr._id || "UNKNOWN";
          acc[status] = (acc[status] || 0) + curr.count;
          return acc;
        }, {});

        // Total lead count based on assignDate
        const assignDateMatch =
          start && end ? { assignDate: { $gte: start, $lte: end } } : {};

        const totalGoogleSheetLeads = await db
          .get()
          .collection(collection.GOOGLESHEETS_COLLECTION)
          .countDocuments({ ...matchCriteria, ...assignDateMatch });

        const totalReferralLeads = await db
          .get()
          .collection(collection.REFERRAL_COLLECTION)
          .countDocuments({ ...matchCriteria, ...assignDateMatch });

        const totalLeads = totalGoogleSheetLeads + totalReferralLeads;

        console.log("Normalized Lead Status Counts:", combinedCounts);
        console.log("Total Leads:", totalLeads);

        resolve({ combinedCounts, totalLeads });
      } catch (error) {
        console.error("Error in getLeadStatusCounts:", error);
        reject(error);
      }
    });
  },
  getLeadStatusCountsok: (sessionEmail, startDate, endDate) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(
          "Lead Owner Email for Count:",
          sessionEmail || "All Lead Owners"
        );
        console.log("Received startDate:", startDate);
        console.log("Received endDate:", endDate);

        const start =
          startDate && !isNaN(Date.parse(startDate))
            ? new Date(startDate).toISOString().split("T")[0]
            : null;
        const end =
          endDate && !isNaN(Date.parse(endDate))
            ? new Date(endDate).toISOString().split("T")[0]
            : null;

        console.log("Parsed startDate:", start);
        console.log("Parsed endDate:", end);

        // Match criteria - if sessionEmail is null, don't filter by lead owner
        let matchCriteria = sessionEmail ? { leadOwnerName: sessionEmail } : {};

        const dateMatch =
          start && end
            ? {
                $match: {
                  "leadStatusArray.v.date": { $gte: start, $lte: end },
                },
              }
            : { $match: {} };

        const googleSheetsCounts = await db
          .get()
          .collection(collection.GOOGLESHEETS_COLLECTION)
          .aggregate([
            { $match: matchCriteria },
            {
              $project: {
                leadStatusArray: {
                  $objectToArray: "$leadStatus",
                },
              },
            },
            { $unwind: "$leadStatusArray" },
            dateMatch,
            {
              $group: {
                _id: "$leadStatusArray.k",
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        const referralCounts = await db
          .get()
          .collection(collection.REFERRAL_COLLECTION)
          .aggregate([
            { $match: matchCriteria },
            {
              $project: {
                leadStatusArray: {
                  $objectToArray: "$leadStatus",
                },
              },
            },
            { $unwind: "$leadStatusArray" },
            dateMatch,
            {
              $group: {
                _id: "$leadStatusArray.k",
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        const combinedCounts = [
          ...googleSheetsCounts,
          ...referralCounts,
        ].reduce((acc, curr) => {
          const status = curr._id || "UNKNOWN";
          acc[status] = (acc[status] || 0) + curr.count;
          return acc;
        }, {});

        const assignDateMatch =
          start && end ? { assignDate: { $gte: start, $lte: end } } : {};

        const totalGoogleSheetLeads = await db
          .get()
          .collection(collection.GOOGLESHEETS_COLLECTION)
          .countDocuments({ ...matchCriteria, ...assignDateMatch });

        const totalReferralLeads = await db
          .get()
          .collection(collection.REFERRAL_COLLECTION)
          .countDocuments({ ...matchCriteria, ...assignDateMatch });

        const totalLeads = totalGoogleSheetLeads + totalReferralLeads;

        console.log("Normalized Lead Status Counts:", combinedCounts);
        console.log("Total Leads:", totalLeads);

        resolve({ combinedCounts, totalLeads });
      } catch (error) {
        console.error("Error in getLeadStatusCounts:", error);
        reject(error);
      }
    });
  },

  getFilteredLeadCounts: (sessionEmail, startDate, endDate) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log("Start Date:", startDate);
        console.log("End Date:", endDate);
        console.log("Lead Owner Email:", sessionEmail);

        // Convert startDate and endDate to Date objects with only the date portion
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Set the time portion of 'end' to the end of the day
        end.setHours(23, 59, 59, 999);

        console.log("Parsed Start Date:", start);
        console.log("Parsed End Date:", end);

        // Function to aggregate lead statuses and counts
        const aggregateLeadStatus = async (collectionName) => {
          return db
            .get()
            .collection(collectionName)
            .aggregate([
              {
                $match: {
                  leadOwnerName: sessionEmail,
                  assignDate: {
                    $gte: start,
                    $lt: end,
                  },
                },
              },
              { $project: { leadStatus: 1, assignDate: 1 } },
              {
                $unwind: {
                  path: "$leadStatus",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $group: {
                  _id: { $ifNull: ["$leadStatus.status", "UNKNOWN"] },
                  count: { $sum: 1 },
                  latestDate: { $max: "$leadStatus.date" }, // Include the latest date (date only)
                },
              },
            ])
            .toArray();
        };

        // Aggregate and log Google Sheets counts
        const googleSheetsCounts = await aggregateLeadStatus(
          collection.GOOGLESHEETS_COLLECTION
        );
        console.log("Google Sheets Counts:", googleSheetsCounts);

        // Count and log total Google Sheets leads
        const totalGoogleSheetLeads = await db
          .get()
          .collection(collection.GOOGLESHEETS_COLLECTION)
          .countDocuments({
            leadOwnerName: sessionEmail,
            assignDate: { $gte: start, $lt: end },
          });
        console.log("Total Google Sheets Leads:", totalGoogleSheetLeads);

        // Aggregate and log Referral counts
        const referralCounts = await aggregateLeadStatus(
          collection.REFERRAL_COLLECTION
        );
        console.log("Referral Counts:", referralCounts);

        // Count and log total Referral leads
        const totalReferralLeads = await db
          .get()
          .collection(collection.REFERRAL_COLLECTION)
          .countDocuments({
            leadOwnerName: sessionEmail,
            assignDate: { $gte: start, $lt: end },
          });
        console.log("Total Referral Leads:", totalReferralLeads);

        // Combine and normalize counts for lead statuses
        const combinedCounts = [
          ...googleSheetsCounts,
          ...referralCounts,
        ].reduce((acc, curr) => {
          acc[curr._id] = (acc[curr._id] || 0) + curr.count;
          return acc;
        }, {});

        // Calculate the total leads by summing the document counts from both collections
        const totalLeads = totalGoogleSheetLeads + totalReferralLeads;
        console.log("Total Leads:", totalLeads);

        // Resolve with combined counts and total leads
        resolve({ combinedCounts, totalLeads });
      } catch (error) {
        console.error("Error filtering leads:", error);
        reject(error);
      }
    });
  },

  getAllGooglsheets: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let googlsheets = await db
          .get()
          .collection(collection.GOOGLESHEETS_COLLECTION)
          .find()
          .toArray();
        resolve(googlsheets);
      } catch (error) {
        reject(error);
      }
    });
  },
  getAllReferral: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let referral = await db
          .get()
          .collection(collection.REFERRAL_COLLECTION)
          .find()
          .toArray();
        resolve(referral);
      } catch (error) {
        reject(error);
      }
    });
  },
  updateLeadOwner: (id, leadOwnerName, assignLead, leadStatus, assignDate) => {
    return new Promise(async (resolve, reject) => {
      try {
        const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };

        const updateFields = { leadOwnerName };
        if (assignLead !== undefined) {
          updateFields.assignLead = assignLead;
        }
        if (leadStatus) {
          updateFields.leadStatus = leadStatus;
        }
        if (assignDate) {
          updateFields.assignDate = assignDate;
        }

        const dbInstance = db.get();

        await dbInstance
          .collection(collection.GOOGLESHEETS_COLLECTION)
          .updateOne(query, { $set: updateFields });

        await dbInstance
          .collection(collection.REFERRAL_COLLECTION)
          .updateOne(query, { $set: updateFields });

        resolve();
      } catch (error) {
        console.error("Error updating lead owner:", error);
        reject(error);
      }
    });
  },

 updateLeadStatus: async (id, leadStage, statusObj, isSaved) => {
    return new Promise(async (resolve, reject) => {
        try {
            const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };

            // Fetch existing lead data and lead stages
            const [googlesheet, referral, leadStageData] = await Promise.all([
                db.get().collection(collection.GOOGLESHEETS_COLLECTION).findOne(query),
                db.get().collection(collection.REFERRAL_COLLECTION).findOne(query),
                db.get().collection(collection.LEADSTAGE_COLLECTION).findOne({ stage: leadStage }) // Get lead stage data
            ]);

            // Merge existing statuses and update with the new status
            const currentStatus = googlesheet?.leadStatus || referral?.leadStatus || {};
            const stagesArray = currentStatus[leadStage] || [];

            // Append the new status object to the array of stages
            stagesArray.push(statusObj);

            // Update the collections with the new status structure
            await Promise.all([
                db.get().collection(collection.GOOGLESHEETS_COLLECTION).updateOne(query, {
                    $set: { [`leadStatus.${leadStage}`]: stagesArray, isSaved },
                }),
                db.get().collection(collection.REFERRAL_COLLECTION).updateOne(query, {
                    $set: { [`leadStatus.${leadStage}`]: stagesArray, isSaved },
                }),
            ]);

            resolve();
        } catch (error) {
            reject(error);
        }
    });
},
  getSubStageMandatoryStatus : async (stage, subStage) => {
    try {
      const leadStage = await db
        .get()
        .collection(collection.LEADSTAGE_COLLECTION)
        .findOne({ stage });

      if (leadStage) {
        const subStageInfo = leadStage.substage.find(s => s.name === subStage);
        const isMandatory = subStageInfo ? subStageInfo.mandatory : false;
        return { success: true, isMandatory };
      } else {
        return { success: false, message: 'Lead stage not found' };
      }
    } catch (error) {
      console.error('Error fetching sub-stage mandatory status:', error);
      return { success: false, message: 'An error occurred' };
    }
  },

  getLeadStatus: async (id, leadStage) => {
    try {
      const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };

      // Retrieve data from both collections
      const [googlesheetData, referralData] = await Promise.all([
        db.get().collection(collection.GOOGLESHEETS_COLLECTION).findOne(query),
        db.get().collection(collection.REFERRAL_COLLECTION).findOne(query),
      ]);

      // Merge results from both collections, giving priority to the first found data
      const leadData = googlesheetData || referralData;

      if (!leadData) {
        return { leadStatus: {} }; // Return an empty object if no lead data is found
      }

      // Retrieve and format leadStatus
      const leadStatus = leadData.leadStatus || {};

      // Ensure each stage is an array
      Object.keys(leadStatus).forEach((stage) => {
        if (!Array.isArray(leadStatus[stage])) {
          leadStatus[stage] = [];
        }
      });

      return { leadStatus };
    } catch (error) {
      console.error("Error fetching lead status:", error);
      throw new Error("Error fetching lead status");
    }
  },

  // Updated getAllStudentRef function
  getAllStudentRef: (studentid) => {
    return new Promise(async (resolve, reject) => {
      try {
        let referral = await db
          .get()
          .collection(collection.REFERRAL_COLLECTION)
          .find({ ReferredBy: studentid }) // Filter documents where ReferredBy matches the studentid
          .toArray();
        resolve(referral);
      } catch (error) {
        reject(error);
      }
    });
  },
  getAllPatnerReferral: (instituteid) => {
    return new Promise(async (resolve, reject) => {
      try {
        let referral = await db
          .get()
          .collection(collection.REFERRAL_COLLECTION)
          .find({ ReferredBy: instituteid }) // Filter documents where ReferredBy matches the instituteid
          .toArray();
        resolve(referral);
      } catch (error) {
        reject(error);
      }
    });
  },
  getUniqueReferredByCount: async (instituteid) => {
    try {
      console.log("Fetching ReferredBy count for instituteid:", instituteid);

      const database = db.get();
      const referralCollection = database.collection(
        collection.REFERRAL_COLLECTION
      );

      // Find and count the documents where ReferredBy matches the instituteid
      const referredByCount = await referralCollection.countDocuments({
        ReferredBy: instituteid,
      });

      console.log("ReferredBy Count:", referredByCount);

      return referredByCount;
    } catch (error) {
      console.error("Error fetching ReferredBy count:", error);
      throw new Error("Internal Server Error");
    }
  },

  getAllAccountsdashboard: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let client = await db
          .get()
          .collection(collection.CLIENT_COLLECTION)
          .find({ assignaccounts: "Assigned to accounts department" }) // Filter documents where assign is "client"
          .toArray();
        resolve(client);
      } catch (error) {
        reject(error);
      }
    });
  },
  authenticateLeadOwner: (email, password) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Find the lead owner by email
        const leadOwner = await db
          .get()
          .collection(collection.CRM_LEAD_COLLECTION)
          .findOne({ email });

        if (!leadOwner) {
          return reject(new Error("Invalid email or password"));
        }

        // Compare the hashed password with the provided password
        const match = await bcrypt.compare(password, leadOwner.password);

        if (!match) {
          return reject(new Error("Invalid email or password"));
        }

        // Return the lead owner data if authentication is successful
        resolve(leadOwner);
      } catch (error) {
        reject(new Error("Error during authentication: " + error.message));
      }
    });
  },
  uploadProfilePhoto: async (email, imageUrl) => {
    try {
      const database = db.get();
      const clientsCollection = database.collection(
        collection.CLIENT_COLLECTION
      );

      const result = await clientsCollection.updateOne(
        { email },
        { $set: { profilePhoto: imageUrl } }
      );

      if (result.modifiedCount > 0) {
        return { success: true };
      } else {
        return { success: false };
      }
    } catch (error) {
      console.error("Error updating profile photo:", error);
      return { success: false };
    }
  },
  uploadProfilePhotos: async (email, imageUrl) => {
    try {
      const database = db.get();
      const clientsCollection = database.collection(
        collection.PATNER_COLLECTION
      );

      const result = await clientsCollection.updateOne(
        { email },
        { $set: { profilePhoto: imageUrl } }
      );

      if (result.modifiedCount > 0) {
        return { success: true };
      } else {
        return { success: false };
      }
    } catch (error) {
      console.error("Error updating profile photo:", error);
      return { success: false };
    }
  },
  uploadAfProfilePhotos: async (email, imageUrl) => {
    try {
      const database = db.get();
      const clientsCollection = database.collection(
        collection.AFFILIATE_COLLECTION
      );

      const result = await clientsCollection.updateOne(
        { email },
        { $set: { profilePhoto: imageUrl } }
      );

      if (result.modifiedCount > 0) {
        return { success: true };
      } else {
        return { success: false };
      }
    } catch (error) {
      console.error("Error updating profile photo:", error);
      return { success: false };
    }
  },
  authenticatePartners: async (email, password) => {
    try {
      const database = db.get();
      const partnersCollection = database.collection(
        collection.PATNER_COLLECTION
      );

      // Find the partner by email
      const partner = await partnersCollection.findOne({ email });

      if (!partner) {
        return { success: false, message: "Email or password is incorrect" };
      }

      // Compare the provided password with the hashed password in the database
      const isMatch = await bcrypt.compare(password, partner.password);

      if (!isMatch) {
        return { success: false, message: "Email or password is incorrect" };
      }

      // Return the partner details upon successful authentication
      return {
        success: true,
        message: "Sign-in successful",
        partner, // Return the partner object
      };
    } catch (error) {
      console.error("Error during authentication:", error);
      return {
        success: false,
        message: "Internal Server Error: " + error.message,
      };
    }
  },
  authenticateAfPartners: async (email, password) => {
    try {
      const database = db.get();
      const partnersCollection = database.collection(
        collection.AFFILIATE_COLLECTION
      );

      // Find the partner by email
      const partner = await partnersCollection.findOne({ email });

      if (!partner) {
        return { success: false, message: "Email or password is incorrect" };
      }

      // Compare the provided password with the hashed password in the database
      const isMatch = await bcrypt.compare(password, partner.password);

      if (!isMatch) {
        return { success: false, message: "Email or password is incorrect" };
      }

      // Return the partner details upon successful authentication
      return {
        success: true,
        message: "Sign-in successful",
        partner, // Return the partner object
      };
    } catch (error) {
      console.error("Error during authentication:", error);
      return {
        success: false,
        message: "Internal Server Error: " + error.message,
      };
    }
  },
  createAfPartner: async (formData) => {
    try {
      const database = db.get();
      const partnersCollection = database.collection(
        collection.AFFILIATE_COLLECTION
      );

      // Generate the base institute ID
      const baseInstituteId =
        "IEHAP-" +
        formData.name.split(" ").join("").substring(0, 4).toUpperCase();

      // Find the latest institute ID with the same base
      const latestPartner = await partnersCollection
        .find({ instituteid: { $regex: `^${baseInstituteId}-\\d{5}$` } })
        .sort({ instituteid: -1 })
        .limit(1)
        .toArray();

      let nextInstituteId;
      if (latestPartner.length > 0) {
        // Extract the number part and increment it
        const latestNumber = parseInt(
          latestPartner[0].instituteid.split("-").pop(),
          10
        );
        nextInstituteId = `${baseInstituteId}-${(latestNumber + 1)
          .toString()
          .padStart(5, "0")}`;
      } else {
        // Start with the first number 00436
        nextInstituteId = `${baseInstituteId}-00313`;
      }

      // Check if the email or institute ID already exists
      const existingPartner = await partnersCollection.findOne({
        $or: [{ email: formData.email }, { instituteid: nextInstituteId }],
      });

      if (existingPartner) {
        if (existingPartner.email === formData.email) {
          return { success: false, message: "Email already exists" };
        }
        if (existingPartner.instituteid === nextInstituteId) {
          return { success: false, message: "Institute ID already exists" };
        }
      }

      // Hash the password before storing it
      const hashedPassword = await bcrypt.hash(formData.password, 10);

      // Create a new partner document with the updated fields
      const newPartner = {
        name: formData.name,
        email: formData.email,
        mobNumber: formData.mobile_number, // Corrected field name
        workingStatus: formData.working_status, // Corrected field name
        position: formData.position,
        presentCompany: formData.present_company, // Corrected field name
        state: formData.state,
        city: formData.city,
        password: hashedPassword, // Store the hashed password
        instituteid: nextInstituteId, // Use the generated institute ID
      };

      // Insert the new partner document into the collection
      const result = await partnersCollection.insertOne(newPartner);

      console.log("New Partner Created:", result);
      return {
        success: true,
        message: "Partner created successfully",
        data: result.insertedId,
      };
    } catch (error) {
      console.error("Error creating partner:", error);
      return {
        success: false,
        message: "Internal Server Error: " + error.message,
      };
    }
  },
  sendOtp: async (email, otpStore) => {
    try {
      const database = db.get();
      const partnersCollection = database.collection(
        collection.AFFILIATE_COLLECTION
      );

      // Check if the email already exists in the collection
      const existingPartner = await partnersCollection.findOne({
        email: email,
      });

      if (existingPartner) {
        return { success: false, message: "Email already exists" };
      }

      // Generate OTP (for demo purposes, use a real OTP generation logic in production)
      const otp = Math.floor(100000 + Math.random() * 900000);

      // Store the OTP temporarily (consider using a more secure method in production)
      otpStore[email] = otp;

      // Send OTP via email (using nodemailer or another service)
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "clientsupport@indianeduhub.com",
          pass: "xeep ypij nhqg ilcd",
        },
      });

      const mailOptions = {
        from: "clientsupport@indianeduhub.com",
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP code is ${otp}`,
      };

      await transporter.sendMail(mailOptions);

      return { success: true, message: "OTP sent successfully" };
    } catch (error) {
      console.error("Error sending OTP:", error);
      return {
        success: false,
        message: "Failed to send OTP: " + error.message,
      };
    }
  },
  sendOtpPatner: async (email, otpStore) => {
    try {
      const database = db.get();
      const partnersCollection = database.collection(
        collection.PATNER_COLLECTION
      );

      // Check if the email already exists in the collection
      const existingPartner = await partnersCollection.findOne({
        email: email,
      });

      if (existingPartner) {
        return { success: false, message: "Email already exists" };
      }

      // Generate OTP (for demo purposes, use a real OTP generation logic in production)
      const otp = Math.floor(100000 + Math.random() * 900000);

      // Store the OTP temporarily (consider using a more secure method in production)
      otpStore[email] = otp;

      // Send OTP via email (using nodemailer or another service)
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "clientsupport@indianeduhub.com",
          pass: "xeep ypij nhqg ilcd",
        },
      });

      const mailOptions = {
        from: "clientsupport@indianeduhub.com",
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP code is ${otp}`,
      };

      await transporter.sendMail(mailOptions);

      return { success: true, message: "OTP sent successfully" };
    } catch (error) {
      console.error("Error sending OTP:", error);
      return {
        success: false,
        message: "Failed to send OTP: " + error.message,
      };
    }
  },
  createPartner: async (formData) => {
    try {
      const database = db.get();
      const partnersCollection = database.collection(
        collection.PATNER_COLLECTION
      );

      // Generate the base institute ID
      const baseInstituteId =
        "IEHI-" +
        formData.institute_name
          .split(" ")
          .join("")
          .substring(0, 4)
          .toUpperCase();

      // Find the latest institute ID with the same base
      const latestPartner = await partnersCollection
        .find({ instituteid: { $regex: `^${baseInstituteId}-\\d{5}$` } })
        .sort({ instituteid: -1 })
        .limit(1)
        .toArray();

      let nextInstituteId;
      if (latestPartner.length > 0) {
        const latestNumber = parseInt(
          latestPartner[0].instituteid.split("-").pop(),
          10
        );
        nextInstituteId = `${baseInstituteId}-${(latestNumber + 1)
          .toString()
          .padStart(5, "0")}`;
      } else {
        nextInstituteId = `${baseInstituteId}-00786`;
      }

      // Check if the email or institute ID already exists
      const existingPartner = await partnersCollection.findOne({
        $or: [{ email: formData.email }, { instituteid: nextInstituteId }],
      });

      if (existingPartner) {
        if (existingPartner.email === formData.email) {
          return { success: false, message: "Email already exists" };
        }
        if (existingPartner.instituteid === nextInstituteId) {
          return { success: false, message: "Institute ID already exists" };
        }
      }

      // Hash the password before storing it
      const hashedPassword = await bcrypt.hash(formData.password, 10);

      // Create a new partner document
      const newPartner = {
        institutename: formData.institute_name,
        instituteid: nextInstituteId,
        owner_name: formData.owner_name,
        company_type: formData.company_type,
        established_date: formData.established_date,
        institute_provides: formData.institute_provides,
        state: formData.state,
        city: formData.city,
        email: formData.email,
        password: hashedPassword,
        account_holder_name: formData.account_holder_name,
        account_number: formData.account_number,
        ifsc_code: formData.ifsc_code,
        branch: formData.branch,
      };

      // Insert the new partner document into the collection
      const result = await partnersCollection.insertOne(newPartner);

      console.log("New Partner Created:", result);
      return {
        success: true,
        message: "Partner created successfully",
        data: result.insertedId,
      };
    } catch (error) {
      console.error("Error creating partner:", error);
      return {
        success: false,
        message: "Internal Server Error: " + error.message,
      };
    }
  },

  getAllClientdashboard: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let client = await db
          .get()
          .collection(collection.CLIENT_COLLECTION)
          .find({ assign: "client" }) // Filter documents where assign is "client"
          .toArray();
        resolve(client);
      } catch (error) {
        reject(error);
      }
    });
  },

  authenticatePartner: async (email, password) => {
    try {
      const database = db.get();
      const partnersCollection = database.collection(
        collection.PATNER_COLLECTION
      );

      // Find the partner by email
      const partner = await partnersCollection.findOne({ email });

      if (!partner) {
        return { success: false, message: "Invalid email or password" };
      }

      // Check if the provided password matches the hashed password
      const isMatch = await bcrypt.compare(password, partner.password);

      if (!isMatch) {
        return { success: false, message: "Invalid email or password" };
      }

      // Generate a JWT token
      const token = jwt.sign({ userId: partner._id }, "your_jwt_secret", {
        expiresIn: "1h",
      });

      return { success: true, token, message: "Login successful" };
    } catch (error) {
      console.error("Error logging in:", error);
      return {
        success: false,
        message: "Internal Server Error: " + error.message,
      };
    }
  },

  authenticateStudents: (email, password) => {
    return new Promise(async (resolve, reject) => {
      try {
        const student = await db
          .get()
          .collection(collection.CLIENT_COLLECTION)
          .findOne({ email });

        if (!student) {
          return reject(new Error("Invalid email or password"));
        }

        if (student.idApproved !== "Approved") {
          return reject(new Error("Your account is blocked"));
        }

        const match = await bcrypt.compare(password, student.password);

        if (!match) {
          return reject(new Error("Invalid email or password"));
        }

        resolve({
          name: student.name,
          email: student.email,
          course: student.course,
          specialization: student.specialization,
          mobile: student.mobile,
          studentid: student.studentid,
          city: student.city,
          state: student.state,
          university: student.university,
          profilePhoto: student.profilePhoto, // Include profile photo URL
        });
      } catch (error) {
        reject(new Error("Error during authentication: " + error.message));
      }
    });
  },

  getStudentById: async (studentId) => {
    try {
      const database = db.get();
      const clientsCollection = database.collection(
        collection.CLIENT_COLLECTION
      );

      const student = await clientsCollection.findOne({ studentid: studentId });

      if (!student) {
        return { success: true, student: null }; // Change to success: true but student: null
      }

      return { success: true, student };
    } catch (error) {
      console.error("Error fetching student by ID:", error);
      return { success: false, message: "Failed to retrieve student details" };
    }
  },
  submitFormDataSug: async (formData) => {
    try {
      const database = db.get();
      const clientsCollection = database.collection(
        collection.REFERRAL_COLLECTION
      );
      const googleSheetsCollection = database.collection(
        collection.GOOGLESHEETS_COLLECTION
      );

      // Prepare separate queries for email and mobile
      const emailQuery = { email: formData.email };
      const mobileQuery = { mobile: formData.mobile };

      // Check if email exists in either collection
      const existingEmailInClients = await clientsCollection.findOne(
        emailQuery
      );
      const existingEmailInGoogleSheets = await googleSheetsCollection.findOne(
        emailQuery
      );

      // Check if mobile exists in either collection
      const existingMobileInClients = await clientsCollection.findOne(
        mobileQuery
      );
      const existingMobileInGoogleSheets = await googleSheetsCollection.findOne(
        mobileQuery
      );

      // Prepare response based on the existence of email or mobile
      let responseMessage = "";
      if (existingEmailInClients || existingEmailInGoogleSheets) {
        responseMessage += "Email already exists.";
      }
      if (existingMobileInClients || existingMobileInGoogleSheets) {
        if (responseMessage) responseMessage += " ";
        responseMessage += "Mobile number already exists.";
      }

      if (responseMessage) {
        return {
          success: false,
          message: responseMessage.trim(),
        };
      }

      // Proceed with insertion if no existing records
      const result = await clientsCollection.insertOne(formData);

      return {
        success: result.acknowledged && result.insertedId,
        message:
          result.acknowledged && result.insertedId
            ? "Form submitted successfully"
            : "Failed to submit form",
      };
    } catch (error) {
      console.error("Error submitting form data:", error);
      return {
        success: false,
        message: "Internal Server Error: " + error.message,
      };
    }
  },

  addClient: async (client, callback) => {
    try {
      const database = db.get();
      const clientsCollection = database.collection("client");

      // Check if mobile number or email already exists
      const existingClient = await clientsCollection.findOne({
        $or: [{ mobile: client.mobile }, { email: client.email }],
      });

      if (existingClient) {
        return callback(null, "Mobile number or email already exists");
      }

      // Fetch the current maximum studentid from the collection
      const lastClient = await clientsCollection
        .find()
        .sort({ studentid: -1 })
        .limit(1)
        .toArray();

      console.log("Last Client Fetched:", lastClient);

      let lastStudentId = "IEH5785"; // Default starting ID if no records exist

      if (lastClient.length > 0) {
        lastStudentId = lastClient[0].studentid;
      }

      console.log("Last Student ID:", lastStudentId);

      // Check if lastStudentId is valid before calling replace
      if (!lastStudentId || typeof lastStudentId !== "string") {
        throw new Error("Invalid last student ID format or no ID found");
      }

      // Extract numeric part and increment
      const lastIdNum = parseInt(lastStudentId.replace("IEH", ""), 10);
      if (isNaN(lastIdNum)) {
        throw new Error("Invalid last student ID format");
      }
      const newIdNum = lastIdNum + 1;
      const newStudentId = `IEH${newIdNum}`;

      // Add the new studentid to the client object
      client.studentid = newStudentId;

      // Insert the client with the new student ID
      const result = await clientsCollection.insertOne(client);

      console.log("Client Inserted:", result);
      callback(result.insertedId, null);
    } catch (error) {
      console.error("Error adding client:", error);
      callback(null, error.message);
    }
  },
  updateClientDetails: async (id, updates) => {
    try {
      // Hash the password if it exists
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, saltRounds);
      }

      const result = await db
        .get()
        .collection(collection.CLIENT_COLLECTION)
        .updateOne(
          { _id: ObjectId(id) }, // Find the client by id
          { $set: updates } // Update the fields with new values
        );

      if (result.matchedCount === 0) {
        throw new Error("Client not found");
      }

      return { success: true, message: "Client details updated successfully" };
    } catch (error) {
      console.error("Error updating client details:", error);
      throw new Error("Error updating client details");
    }
  },
};
