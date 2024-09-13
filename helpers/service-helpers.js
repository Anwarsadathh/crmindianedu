const { ObjectId } = require("mongodb");
const collection = require("../config/collection");
const db = require("../config/connection");
const bcrypt = require("bcrypt");
const saltRounds = 10; // Define saltRounds
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bodyParser = require("body-parser");


module.exports = {
  getPaymentStepsByStudyStage: async (studyStage) => {
    if (!studyStage) {
      throw new Error("Study stage is required");
    }

    try {
      const database = db.get(); // Get the database instance
      const clientCollection = database.collection(
        collection.CLIENT_COLLECTION
      ); // Get the collection

      // Fetch payment steps based on studyStage
      const paymentSteps = await clientCollection.findOne({
        studyStage: studyStage,
      });

      if (!paymentSteps) {
        throw new Error("No payment steps found for this study stage");
      }

      return paymentSteps;
    } catch (error) {
      throw new Error(`Error fetching payment steps: ${error.message}`);
    }
  },
  updateAccountsDetails: async (
    clientId,
    { studyStage, payments, finalStatus, additionalAmount, additionalDate }
  ) => {
    try {
      const client = await db.get().collection(collection.CLIENT_COLLECTION);

      // Update client details in MongoDB
      await client.updateOne(
        { _id: new ObjectId(clientId) }, // Convert clientId to ObjectId if it's not already
        {
          $set: {
            studyStage,
            payments,
            finalStatus,
            additionalAmount,
            additionalDate,
          },
        }
      );

      return { success: true, message: "Client details updated successfully." };
    } catch (error) {
      console.error("Error updating client details:", error);
      return { success: false, message: "Failed to update client details." };
    }
  },
  signUpSuperAdmin: async (name, email, password) => {
    try {
      const superCollection = db.get().collection(collection.SUPER_COLLECTION);

      // Check if email already exists
      const existingSuper = await superCollection.findOne({ email });
      if (existingSuper) {
        return {
          success: false,
          message: "Super Admin with this email already exists.",
        };
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert the new Super Admin into the collection
      await superCollection.insertOne({
        name,
        email,
        password: hashedPassword,
      });

      return { success: true };
    } catch (error) {
      console.error("Error during Super Admin sign-up:", error);
      throw new Error("Internal server error");
    }
  },
  validateSuperAdminLogin: async (email, password) => {
    try {
      const superCollection = db.get().collection(collection.SUPER_COLLECTION);

      // Check if the email exists in the Super Admin collection
      const superAdmin = await superCollection.findOne({ email });
      if (!superAdmin) {
        return { success: false, message: "Invalid email or password" };
      }

      // Check if the password matches
      const isPasswordValid = await bcrypt.compare(
        password,
        superAdmin.password
      );
      if (!isPasswordValid) {
        return { success: false, message: "Invalid email or password" };
      }

      // If valid, return the Super Admin details
      return { success: true, superAdmin };
    } catch (error) {
      console.error("Error in validating Super Admin login:", error);
      return { success: false, message: "Internal server error" };
    }
  },
  // Function to create a session for Super Admin
  createSuperAdminSession: (req, email) => {
    return new Promise((resolve, reject) => {
      req.session.super = email;
      req.session.save((err) => {
        if (err) {
          console.error("Error saving session:", err);
          return reject({ success: false, message: "Internal server error" });
        }
        resolve({ success: true });
      });
    });
  },
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
  getSubStagesFromDatabase: (stage, mainStage) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (
          !stage ||
          typeof stage !== "string" ||
          !mainStage ||
          typeof mainStage !== "string"
        ) {
          return reject({ message: "Invalid stage or main stage value." });
        }

        // Retrieve the stage document
        const stageDocument = await db
          .get()
          .collection(collection.LEADSTAGE_COLLECTION)
          .findOne({ stage, mainStage });

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

  getStagesFromDatabase: (mainStage) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!mainStage || typeof mainStage !== "string") {
          return reject({ message: "Invalid main stage value." });
        }

        // Retrieve stages that belong to the specified main stage
        const stages = await db
          .get()
          .collection(collection.LEADSTAGE_COLLECTION)
          .find({ mainStage })
          .toArray();

        if (stages) {
          resolve(stages.map((stage) => stage.stage));
        } else {
          resolve([]); // No stages available for the given main stage
        }
      } catch (error) {
        reject(error);
      }
    });
  },
  getLeadStageById: (id) => {
    return new Promise(async (resolve, reject) => {
      try {
        const leadStage = await db
          .get()
          .collection(collection.LEADSTAGE_COLLECTION)
          .findOne({ _id: ObjectId(id) });
        resolve(leadStage);
      } catch (error) {
        reject(error);
      }
    });
  },
  deleteLeadStage: (id) => {
    return new Promise(async (resolve, reject) => {
      try {
        await db
          .get()
          .collection(collection.LEADSTAGE_COLLECTION)
          .deleteOne({ _id: new ObjectId(id) });

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  updateLeadStage: (id, updatedData) => {
    return new Promise(async (resolve, reject) => {
      try {
        await db
          .get()
          .collection(collection.LEADSTAGE_COLLECTION)
          .updateOne({ _id: ObjectId(id) }, { $set: updatedData });
        resolve();
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
        const existingLeadStage = await db
          .get()
          .collection(collection.LEADSTAGE_COLLECTION)
          .findOne({
            mainStage: leadStageData.mainStage,
            stage: leadStageData.stage,
          });

        if (existingLeadStage) {
          return reject({ message: "Lead Stage already exists" });
        }

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
  getPaymentById: async (id) => {
    try {
      console.log(`Fetching payment with ID: ${id}`);
      const payment = await db
        .get()
        .collection(collection.PAYMENTS_COLLECTION)
        .findOne({ _id: ObjectId(id) });
      console.log("Fetched payment:", payment);
      return payment;
    } catch (error) {
      console.error("Error in getPaymentById:", error);
      throw error;
    }
  },

  createPayments: async (payments) => {
    try {
      if (Array.isArray(payments)) {
        const paymentDocument = {
          payments: payments.map((payment, index) => ({
            step: index + 1,
            fields: payment.fields,
          })),
        };

        await db
          .get()
          .collection(collection.PAYMENTS_COLLECTION)
          .insertOne(paymentDocument);
      } else {
        throw new Error("Invalid payments data format");
      }
    } catch (error) {
      console.error("Error in createPayments:", error);
      throw error;
    }
  },

  getAllPayments: async () => {
    try {
      const payments = await db
        .get()
        .collection(collection.PAYMENTS_COLLECTION)
        .find()
        .toArray();
      return payments;
    } catch (error) {
      console.error("Error in getAllPayments:", error);
      throw error;
    }
  },
  // Adjusting getAllPartners function to handle the query correctly
  getAllPartnersW: async (instituteid) => {
    try {
      const partners = await db
        .get()
        .collection(collection.PATNER_COLLECTION)
        .find({ instituteid: instituteid }) // Ensure you're filtering by instituteid
        .toArray();
      return partners;
    } catch (error) {
      console.error("Error in getAllPartners:", error);
      throw error;
    }
  },
  // Helper to update partner wallet
  updatePartnerWallet: async (instituteid, updatedWallet) => {
    try {
      await db // Assuming you're using the `db` object for MongoDB operations
        .get()
        .collection(collection.PATNER_COLLECTION)
        .updateOne(
          { instituteid: instituteid },
          { $set: { wallet: updatedWallet } }
        );
    } catch (error) {
      console.error("Error updating partner wallet:", error);
      throw error;
    }
  },

  // Function to get all affiliate partners' wallet data
  getAllAfPartnersW: async (instituteid) => {
    try {
      const afpartners = await db
        .get()
        .collection(collection.AFFILIATE_COLLECTION)
        .find({ instituteid: instituteid }) // Ensure you're filtering by instituteid
        .toArray();
      return afpartners;
    } catch (error) {
      console.error("Error in getAllAfPartnersW:", error);
      throw error;
    }
  },

  getAllPartners: async () => {
    try {
      const partners = await db
        .get()
        .collection(collection.PATNER_COLLECTION)
        .find()
        .toArray();
      return partners;
    } catch (error) {
      console.error("Error in getAllpartners:", error);
      throw error;
    }
  },
  //   getAllAFPartners: async () => {
  //   try {
  //     const partners = await db
  //       .get()
  //       .collection(collection.AFFILIATE_COLLECTION)
  //       .find()
  //       .toArray();
  //     return partners;
  //   } catch (error) {
  //     console.error("Error in getAllpartners:", error);
  //     throw error;
  //   }
  // },
  getInstituteById: async (instituteId) => {
    try {
      console.log("Fetching Institute with ID:", instituteId); // Debugging output
      const institute = await db
        .get()
        .collection(collection.PATNER_COLLECTION) // Ensure this is the correct collection name
        .findOne({ instituteid: instituteId });
      return institute;
    } catch (error) {
      console.error("Error in getInstituteById:", error);
      throw error;
    }
  },
  getAllSuper: async () => {
    try {
      const supers = await db
        .get()
        .collection(collection.SUPER_COLLECTION)
        .find()
        .toArray();
      return supers;
    } catch (error) {
      console.error("Error in getAllsuper:", error);
      throw error;
    }
  },
  getAllAFPartners: async () => {
    try {
      const afpartners = await db
        .get()
        .collection(collection.AFFILIATE_COLLECTION)
        .find()
        .toArray();
      return afpartners;
    } catch (error) {
      console.error("Error in getAllafpartners:", error);
      throw error;
    }
  },
  // updateWalletInPartners: async (instituteId, walletEntry) => {
  //   try {
  //     const result = await db
  //       .get()
  //       .collection(collection.PATNER_COLLECTION)
  //       .updateOne(
  //         { instituteid: instituteId },
  //         {
  //           $setOnInsert: { wallet: [] }, // If the wallet field doesn't exist, initialize it as an empty array
  //           $push: { wallet: walletEntry }, // Push the new wallet entry into the array
  //         }
  //       );
  //     return result;
  //   } catch (error) {
  //     console.error("Error in updateWalletInPartners:", error);
  //     throw error;
  //   }
  // },
  // In your serviceHelpers or wherever you have defined your helper functions
  updateWalletInSuper: async (instituteId, walletEntry) => {
    try {
      const result = await db
        .get()
        .collection(collection.SUPER_COLLECTION)
        .updateOne(
          {
            $or: [
              { instituteid: instituteId }, // Matches IEHD
              { instituteidP: instituteId }, // Matches IEHP
            ],
          },
          {
            $push: {
              [instituteId === "IEHD" ? "wallet" : "walletP"]: walletEntry,
            },
          }
        );
      return result;
    } catch (error) {
      console.error("Error updating wallet:", error);
      throw error;
    }
  },

  updateWalletInPartners: async (instituteId, walletEntry) => {
    try {
      const partner = await db
        .get()
        .collection(collection.PATNER_COLLECTION)
        .findOne({ instituteid: instituteId });

      // Check if wallet exists and if it's not an array, convert it to an array
      if (partner && !Array.isArray(partner.wallet)) {
        await db
          .get()
          .collection(collection.PATNER_COLLECTION)
          .updateOne(
            { instituteid: instituteId },
            { $set: { wallet: [] } } // Convert the wallet field to an empty array
          );
      }

      // Now push the wallet entry
      const result = await db
        .get()
        .collection(collection.PATNER_COLLECTION)
        .updateOne(
          { instituteid: instituteId },
          { $push: { wallet: walletEntry } }
        );

      return result;
    } catch (error) {
      console.error("Error in updateWalletInPartners:", error);
      throw error;
    }
  },

  updateWalletInAFPartners: async (instituteId, walletEntry) => {
    try {
      const afPartner = await db
        .get()
        .collection(collection.AFFILIATE_COLLECTION)
        .findOne({ instituteid: instituteId });

      // Check if wallet exists and if it's not an array, convert it to an array
      if (afPartner && !Array.isArray(afPartner.wallet)) {
        await db
          .get()
          .collection(collection.AFFILIATE_COLLECTION)
          .updateOne(
            { instituteid: instituteId },
            { $set: { wallet: [] } } // Convert the wallet field to an empty array
          );
      }

      // Now push the wallet entry
      const result = await db
        .get()
        .collection(collection.AFFILIATE_COLLECTION)
        .updateOne(
          { instituteid: instituteId },
          { $push: { wallet: walletEntry } }
        );

      return result;
    } catch (error) {
      console.error("Error in updateWalletInAFPartners:", error);
      throw error;
    }
  },

  deletePayment: async (id) => {
    try {
      await db
        .get()
        .collection(collection.PAYMENTS_COLLECTION)
        .deleteOne({ _id: ObjectId(id) });
    } catch (error) {
      console.error("Error in deletePayment:", error);
      throw error;
    }
  },

  editPayment: async (id, updatedData) => {
    try {
      await db
        .get()
        .collection(collection.PAYMENTS_COLLECTION)
        .updateOne(
          { _id: ObjectId(id) },
          { $set: { payments: updatedData } } // Replace the whole array
        );
    } catch (error) {
      console.error("Error in editPayment:", error);
      throw error;
    }
  },

  // getLeadStatusCounts: async (
  //   sessionEmail,
  //   startDate,
  //   endDate,
  //   filterType,
  //   selectedStage
  // ) => {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       console.log("Lead Owner Email for Count:", sessionEmail);
  //       console.log("Received startDate:", startDate);
  //       console.log("Received endDate:", endDate);
  //       console.log("Received filterType:", filterType);
  //       console.log("Received stage:", selectedStage); // Log the selected stage

  //       const start = startDate
  //         ? new Date(startDate).toISOString().split("T")[0]
  //         : null;
  //       const end = endDate
  //         ? new Date(endDate).toISOString().split("T")[0]
  //         : null;

  //       console.log("Parsed startDate:", start);
  //       console.log("Parsed endDate:", end);

  //       let matchCriteria = { leadOwnerName: sessionEmail };

  //       const [googleSheetData, referralData, stages] = await Promise.all([
  //         db
  //           .get()
  //           .collection(collection.GOOGLESHEETS_COLLECTION)
  //           .find(matchCriteria)
  //           .toArray(),
  //         db
  //           .get()
  //           .collection(collection.REFERRAL_COLLECTION)
  //           .find(matchCriteria)
  //           .toArray(),
  //         db
  //           .get()
  //           .collection(collection.LEADSTAGE_COLLECTION)
  //           .find({})
  //           .toArray(),
  //       ]);

  //       const allData = [...googleSheetData, ...referralData];

  //       const leadStatusCounts = {};
  //       const stageCounts = {};
  //       const subStageCounts = {};

  //       allData.forEach((doc) => {
  //         for (const [mainStage, stages] of Object.entries(
  //           doc.leadStatus || {}
  //         )) {
  //           if (filterType && filterType !== mainStage) continue;

  //           if (!leadStatusCounts[mainStage]) {
  //             leadStatusCounts[mainStage] = { count: 0, stages: {} };
  //           }

  //           for (const [stage, entries] of Object.entries(stages)) {
  //             if (selectedStage && selectedStage !== stage) continue; // Filter by stage

  //             if (!leadStatusCounts[mainStage].stages[stage]) {
  //               leadStatusCounts[mainStage].stages[stage] = {
  //                 count: 0,
  //                 subStages: {},
  //               };
  //             }

  //             if (!stageCounts[mainStage]) {
  //               stageCounts[mainStage] = {};
  //             }
  //             if (!stageCounts[mainStage][stage]) {
  //               stageCounts[mainStage][stage] = 0;
  //             }

  //             entries.forEach((entry) => {
  //               const entryDate = entry.date ? entry.date.split("T")[0] : null;

  //               if (
  //                 entryDate &&
  //                 (!start || entryDate >= start) &&
  //                 (!end || entryDate <= end)
  //               ) {
  //                 leadStatusCounts[mainStage].count += 1;
  //                 leadStatusCounts[mainStage].stages[stage].count += 1;
  //                 stageCounts[mainStage][stage] += 1;

  //                 if (!subStageCounts[mainStage]) {
  //                   subStageCounts[mainStage] = {};
  //                 }
  //                 if (!subStageCounts[mainStage][stage]) {
  //                   subStageCounts[mainStage][stage] = {};
  //                 }
  //                 if (!subStageCounts[mainStage][stage][entry.subStage]) {
  //                   subStageCounts[mainStage][stage][entry.subStage] = 0;
  //                 }
  //                 subStageCounts[mainStage][stage][entry.subStage] += 1;
  //               }
  //             });
  //           }
  //         }
  //       });

  //       const stagesAndSubStages = stages.reduce((acc, stage) => {
  //         if (Array.isArray(stage.substage)) {
  //           acc.push({
  //             mainStage: stage.mainStage,
  //             stage: stage.stage,
  //             substage: stage.substage,
  //           });
  //         } else {
  //           console.error(
  //             `Stages data for main stage "${stage.mainStage}" is not an array:`,
  //             stage
  //           );
  //         }
  //         return acc;
  //       }, []);

  //       const totalLeads = allData.length;

  //       const mainStageCounts = Object.entries(leadStatusCounts).map(
  //         ([mainStage, { count }]) => ({ mainStage, count })
  //       );

  //       const stageCountsFlat = Object.entries(stageCounts).flatMap(
  //         ([mainStage, stages]) =>
  //           Object.entries(stages).map(([stage, count]) => ({
  //             mainStage,
  //             stage,
  //             count,
  //           }))
  //       );

  //       const subStageCountsFlat = Object.entries(subStageCounts).flatMap(
  //         ([mainStage, stages]) =>
  //           Object.entries(stages).flatMap(([stage, subStages]) =>
  //             Object.entries(subStages).map(([subStage, count]) => ({
  //               mainStage,
  //               stage,
  //               subStage,
  //               count,
  //             }))
  //           )
  //       );

  //       console.log("Main Stage Counts:", mainStageCounts);
  //       console.log("Stage Counts:", stageCountsFlat);
  //       console.log("Sub-Stage Counts:", subStageCountsFlat);
  //       console.log("Total Leads:", totalLeads);
  //       console.log(
  //         "Stages and Sub-Stages Data:",
  //         JSON.stringify(stagesAndSubStages, null, 2)
  //       );

  //       resolve({
  //         mainStageCounts,
  //         stageCounts: stageCountsFlat,
  //         subStageCounts: subStageCountsFlat,
  //         totalLeads,
  //         stagesAndSubStages,
  //       });
  //     } catch (error) {
  //       console.error("Error in getLeadStatusCounts:", error);
  //       reject(error);
  //     }
  //   });
  // },
  // getLeadStatusCounts: async (
  //   sessionEmail,
  //   startDate,
  //   endDate,
  //   filterType,
  //   selectedStage,
  //   showLatestSubstage = false // Add a new parameter to control showing latest substage
  // ) => {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       console.log("Lead Owner Email for Count:", sessionEmail);
  //       console.log("Received startDate:", startDate);
  //       console.log("Received endDate:", endDate);
  //       console.log("Received filterType:", filterType);
  //       console.log("Received stage:", selectedStage);
  //       console.log("Show Latest Substage:", showLatestSubstage); // Log the showLatestSubstage flag

  //       const start = startDate
  //         ? new Date(startDate).toISOString().split("T")[0]
  //         : null;
  //       const end = endDate
  //         ? new Date(endDate).toISOString().split("T")[0]
  //         : null;

  //       console.log("Parsed startDate:", start);
  //       console.log("Parsed endDate:", end);

  //       let matchCriteria = { leadOwnerName: sessionEmail };

  //       const [googleSheetData, referralData, stages] = await Promise.all([
  //         db
  //           .get()
  //           .collection(collection.GOOGLESHEETS_COLLECTION)
  //           .find(matchCriteria)
  //           .toArray(),
  //         db
  //           .get()
  //           .collection(collection.REFERRAL_COLLECTION)
  //           .find(matchCriteria)
  //           .toArray(),
  //         db
  //           .get()
  //           .collection(collection.LEADSTAGE_COLLECTION)
  //           .find({})
  //           .toArray(),
  //       ]);

  //       const allData = [...googleSheetData, ...referralData];

  //       const leadStatusCounts = {};
  //       const stageCounts = {};
  //       const subStageCounts = {};

  //       allData.forEach((doc) => {
  //         for (const [mainStage, stages] of Object.entries(
  //           doc.leadStatus || {}
  //         )) {
  //           if (filterType && filterType !== mainStage) continue;

  //           if (!leadStatusCounts[mainStage]) {
  //             leadStatusCounts[mainStage] = { count: 0, stages: {} };
  //           }

  //           for (const [stage, entries] of Object.entries(stages)) {
  //             if (selectedStage && selectedStage !== stage) continue;

  //             // Find the latest substage if showLatestSubstage is true
  //             let filteredEntries = entries;
  //             if (showLatestSubstage) {
  //               filteredEntries = [
  //                 entries.reduce((latest, entry) => {
  //                   return !latest ||
  //                     new Date(entry.date) > new Date(latest.date)
  //                     ? entry
  //                     : latest;
  //                 }, null),
  //               ];
  //             }

  //             if (!leadStatusCounts[mainStage].stages[stage]) {
  //               leadStatusCounts[mainStage].stages[stage] = {
  //                 count: 0,
  //                 subStages: {},
  //               };
  //             }

  //             if (!stageCounts[mainStage]) {
  //               stageCounts[mainStage] = {};
  //             }
  //             if (!stageCounts[mainStage][stage]) {
  //               stageCounts[mainStage][stage] = 0;
  //             }

  //             filteredEntries.forEach((entry) => {
  //               const entryDate = entry.date ? entry.date.split("T")[0] : null;

  //               if (
  //                 entryDate &&
  //                 (!start || entryDate >= start) &&
  //                 (!end || entryDate <= end)
  //               ) {
  //                 leadStatusCounts[mainStage].count += 1;
  //                 leadStatusCounts[mainStage].stages[stage].count += 1;
  //                 stageCounts[mainStage][stage] += 1;

  //                 if (!subStageCounts[mainStage]) {
  //                   subStageCounts[mainStage] = {};
  //                 }
  //                 if (!subStageCounts[mainStage][stage]) {
  //                   subStageCounts[mainStage][stage] = {};
  //                 }
  //                 if (!subStageCounts[mainStage][stage][entry.subStage]) {
  //                   subStageCounts[mainStage][stage][entry.subStage] = 0;
  //                 }
  //                 subStageCounts[mainStage][stage][entry.subStage] += 1;
  //               }
  //             });
  //           }
  //         }
  //       });

  //       const stagesAndSubStages = stages.reduce((acc, stage) => {
  //         if (Array.isArray(stage.substage)) {
  //           acc.push({
  //             mainStage: stage.mainStage,
  //             stage: stage.stage,
  //             substage: stage.substage,
  //           });
  //         } else {
  //           console.error(
  //             `Stages data for main stage "${stage.mainStage}" is not an array:`,
  //             stage
  //           );
  //         }
  //         return acc;
  //       }, []);

  //       const totalLeads = allData.length;

  //       const mainStageCounts = Object.entries(leadStatusCounts).map(
  //         ([mainStage, { count }]) => ({ mainStage, count })
  //       );

  //       const stageCountsFlat = Object.entries(stageCounts).flatMap(
  //         ([mainStage, stages]) =>
  //           Object.entries(stages).map(([stage, count]) => ({
  //             mainStage,
  //             stage,
  //             count,
  //           }))
  //       );

  //       const subStageCountsFlat = Object.entries(subStageCounts).flatMap(
  //         ([mainStage, stages]) =>
  //           Object.entries(stages).flatMap(([stage, subStages]) =>
  //             Object.entries(subStages).map(([subStage, count]) => ({
  //               mainStage,
  //               stage,
  //               subStage,
  //               count,
  //             }))
  //           )
  //       );

  //       console.log("Main Stage Counts:", mainStageCounts);
  //       console.log("Stage Counts:", stageCountsFlat);
  //       console.log("Sub-Stage Counts:", subStageCountsFlat);
  //       console.log("Total Leads:", totalLeads);
  //       console.log(
  //         "Stages and Sub-Stages Data:",
  //         JSON.stringify(stagesAndSubStages, null, 2)
  //       );

  //       resolve({
  //         mainStageCounts,
  //         stageCounts: stageCountsFlat,
  //         subStageCounts: subStageCountsFlat,
  //         totalLeads,
  //         stagesAndSubStages,
  //       });
  //     } catch (error) {
  //       console.error("Error in getLeadStatusCounts:", error);
  //       reject(error);
  //     }
  //   });
  // },
  getLeadDetailsById: async (id) => {
    if (!id || !ObjectId.isValid(id)) {
      throw new Error("Invalid Lead ID");
    }

    try {
      const [googleSheetData, referralData] = await Promise.all([
        db
          .get()
          .collection(collection.GOOGLESHEETS_COLLECTION)
          .find({ _id: new ObjectId(id) })
          .toArray(),
        db
          .get()
          .collection(collection.REFERRAL_COLLECTION)
          .find({ _id: new ObjectId(id) })
          .toArray(),
      ]);

      const allData = [...googleSheetData, ...referralData];

      if (allData.length === 0) {
        throw new Error("Lead not found");
      }

      return allData[0];
    } catch (error) {
      console.error("Error fetching lead details:", error.message);
      throw new Error("Internal Server Error");
    }
  },
  //   getLeadStatusCounts: async (
  //   sessionEmail,
  //   startDate,
  //   endDate,
  //   filterType,
  //   selectedStage,
  //   showLatestSubstage = false // Flag to control showing the latest substage
  // ) => {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       console.log("Lead Owner Email for Count:", sessionEmail);
  //       console.log("Received startDate:", startDate);
  //       console.log("Received endDate:", endDate);
  //       console.log("Received filterType:", filterType);
  //       console.log("Received stage:", selectedStage);
  //       console.log("Show Latest Substage:", showLatestSubstage);

  //      const start =
  //        startDate && !isNaN(Date.parse(startDate))
  //          ? new Date(startDate).toISOString().split("T")[0]
  //          : null;
  //      const end =
  //        endDate && !isNaN(Date.parse(endDate))
  //          ? new Date(endDate).toISOString().split("T")[0]
  //          : null;

  //       console.log("Parsed startDate:", start);
  //       console.log("Parsed endDate:", end);

  //       let matchCriteria = { leadOwnerName: sessionEmail };

  //       const [googleSheetData, referralData] = await Promise.all([
  //         db
  //           .get()
  //           .collection(collection.GOOGLESHEETS_COLLECTION)
  //           .find(matchCriteria)
  //           .toArray(),
  //         db
  //           .get()
  //           .collection(collection.REFERRAL_COLLECTION)
  //           .find(matchCriteria)
  //           .toArray(),
  //       ]);

  //       const allData = [...googleSheetData, ...referralData];

  //       let mainStageCounts = {};
  //       let stageCounts = {};
  //       let subStageCounts = {};
  //       let mainStageList = new Set();

  //       // Add arrays for full details
  //       let mainStageDetails = [];
  //       let stageDetails = [];
  //       let subStageDetails = [];

  //       allData.forEach((doc) => {
  //         console.log("Processing document:", doc); // Log raw data for each document

  //         let latestMainStage = null;
  //         let latestStage = null;
  //         let latestSubStage = null;
  //         let latestDate = null;

  //         for (const [mainStage, stages] of Object.entries(
  //           doc.leadStatus || {}
  //         )) {
  //           // Collect unique main stages
  //           if (!["In Progress", "Completed"].includes(mainStage)) {
  //             mainStageList.add(mainStage);
  //           }
  //           if (filterType && filterType !== mainStage) continue;

  //           for (const [stage, entries] of Object.entries(stages)) {
  //             if (selectedStage && selectedStage !== stage) continue;

  //             const latest = entries.reduce((latest, entry) => {
  //               return !latest || new Date(entry.date) > new Date(latest.date)
  //                 ? entry
  //                 : latest;
  //             }, null);

  //             if (!latestDate || new Date(latest.date) > new Date(latestDate)) {
  //               latestDate = latest.date;
  //               latestMainStage = mainStage;
  //               latestStage = stage;
  //               latestSubStage = latest.subStage;
  //             }
  //           }
  //         }

  //         if (showLatestSubstage && latestDate) {
  //           if (latestMainStage) {
  //             mainStageCounts[latestMainStage] =
  //               (mainStageCounts[latestMainStage] || 0) + 1;
  //             stageCounts[`${latestMainStage}-${latestStage}`] =
  //               (stageCounts[`${latestMainStage}-${latestStage}`] || 0) + 1;
  //             subStageCounts[
  //               `${latestMainStage}-${latestStage}-${latestSubStage}`
  //             ] =
  //               (subStageCounts[
  //                 `${latestMainStage}-${latestStage}-${latestSubStage}`
  //               ] || 0) + 1;

  //             // Store full details
  //             mainStageDetails.push({ mainStage: latestMainStage, doc });
  //             stageDetails.push({
  //               mainStage: latestMainStage,
  //               stage: latestStage,
  //               doc,
  //             });
  //             subStageDetails.push({
  //               mainStage: latestMainStage,
  //               stage: latestStage,
  //               subStage: latestSubStage,
  //               doc,
  //             });
  //           }
  //         }
  //       });

  //       // Ensure all main stages from the mainStageList are included in the output
  //       mainStageList.forEach((mainStage) => {
  //         if (!(mainStage in mainStageCounts)) {
  //           mainStageCounts[mainStage] = 0;
  //         }
  //       });

  //       // Convert counts to arrays
  //       const mainStageCountsArray = Array.from(mainStageList).map(
  //         (mainStage) => ({
  //           mainStage,
  //           count: mainStageCounts[mainStage],
  //         })
  //       );

  //       const stageCountsArray = Object.keys(stageCounts).map((key) => {
  //         const [mainStage, stage] = key.split("-");
  //         return {
  //           mainStage,
  //           stage,
  //           count: stageCounts[key],
  //         };
  //       });

  //       const subStageCountsArray = Object.keys(subStageCounts).map((key) => {
  //         const [mainStage, stage, subStage] = key.split("-");
  //         return {
  //           mainStage,
  //           stage,
  //           subStage,
  //           count: subStageCounts[key],
  //         };
  //       });

  //       // Log detailed information about the counts
  //       console.log("Main Stage Counts Array:", mainStageCountsArray);
  //       mainStageCountsArray.forEach(({ mainStage, count }) => {
  //         console.log(`Main Stage: ${mainStage}, Count: ${count}`);
  //         Object.keys(stageCounts).forEach((key) => {
  //           if (key.startsWith(`${mainStage}-`)) {
  //             const [_, stage] = key.split("-");
  //             console.log(`  Stage: ${stage}, Count: ${stageCounts[key]}`);
  //             Object.keys(subStageCounts).forEach((subKey) => {
  //               if (subKey.startsWith(`${mainStage}-${stage}-`)) {
  //                 const [_, __, subStage] = subKey.split("-");
  //                 console.log(
  //                   `    Sub-Stage: ${subStage}, Count: ${subStageCounts[subKey]}`
  //                 );
  //               }
  //             });
  //           }
  //         });
  //       });

  //       console.log("Total Leads:", allData.length);

  //       resolve({
  //         mainStageCounts: mainStageCountsArray,
  //         stageCounts: stageCountsArray,
  //         subStageCounts: subStageCountsArray,
  //         totalLeads: allData.length,
  //         mainStageDetails, // Full details returned here
  //         stageDetails, // Full details returned here
  //         subStageDetails, // Full details returned here
  //       });
  //     } catch (error) {
  //       console.error("Error in getLeadStatusCounts:", error);
  //       reject(error);
  //     }
  //   });
  // },

  // getLeadStatusCounts: async (
  //   sessionEmail,
  //   startDate,
  //   endDate,
  //   filterType,
  //   selectedStage,
  //   showLatestSubstage = false
  // ) => {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       console.log("Lead Owner Email for Count:", sessionEmail);
  //       console.log("Received startDate:", startDate);
  //       console.log("Received endDate:", endDate);
  //       console.log("Received filterType:", filterType);
  //       console.log("Received stage:", selectedStage);
  //       console.log("Show Latest Substage:", showLatestSubstage);

  //       // Parse startDate and endDate
  //       const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
  //       const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

  //       if ((startDate && !start) || (endDate && !end)) {
  //         throw new Error("Invalid date value provided");
  //       }

  //       let matchCriteria = { leadOwnerName: sessionEmail };

  //       // Fetch data
  //       const [googleSheetData, referralData] = await Promise.all([
  //         db.get().collection(collection.GOOGLESHEETS_COLLECTION).find(matchCriteria).toArray(),
  //         db.get().collection(collection.REFERRAL_COLLECTION).find(matchCriteria).toArray(),
  //       ]);

  //       const allData = [...googleSheetData, ...referralData];

  //       let mainStageCounts = {};
  //       let stageCounts = {};
  //       let subStageCounts = {};
  //       let mainStageList = new Set();

  //       let mainStageDetails = [];
  //       let stageDetails = [];
  //       let subStageDetails = [];

  //       allData.forEach((doc) => {
  //         console.log("Processing document:", doc);

  //         let latestMainStage = null;
  //         let latestStage = null;
  //         let latestSubStage = null;
  //         let latestDate = null;

  //         for (const [mainStage, stages] of Object.entries(doc.leadStatus || {})) {
  //           if (!["In Progress", "Completed"].includes(mainStage)) {
  //             mainStageList.add(mainStage);
  //           }
  //           if (filterType && filterType !== mainStage) continue;

  //           for (const [stage, entries] of Object.entries(stages)) {
  //             if (selectedStage && selectedStage !== stage) continue;

  //             const filteredEntries = entries.filter((entry) => {
  //               const entryDate = new Date(entry.date).getTime();
  //               return entryDate >= start && entryDate <= end;
  //             });

  //             console.log(`Filtered Entries for ${mainStage} - ${stage}:`, filteredEntries);

  //             if (filteredEntries.length === 0) continue;

  //             const latest = filteredEntries.reduce((latest, entry) => {
  //               const entryDate = new Date(entry.date).getTime();
  //               if (isNaN(entryDate)) {
  //                 console.warn("Invalid date found in entry:", entry);
  //                 return latest;
  //               }
  //               return !latest || entryDate > new Date(latest.date).getTime()
  //                 ? entry
  //                 : latest;
  //             }, null);

  //             console.log(`Latest Entry for ${mainStage} - ${stage}:`, latest);

  //             if (latest && (!latestDate || new Date(latest.date) > new Date(latestDate))) {
  //               latestDate = latest.date;
  //               latestMainStage = mainStage;
  //               latestStage = stage;
  //               latestSubStage = latest.subStage;
  //             }
  //           }
  //         }

  //         if (showLatestSubstage && latestDate) {
  //           if (latestMainStage) {
  //             mainStageCounts[latestMainStage] = (mainStageCounts[latestMainStage] || 0) + 1;
  //             stageCounts[`${latestMainStage}-${latestStage}`] = (stageCounts[`${latestMainStage}-${latestStage}`] || 0) + 1;
  //             subStageCounts[`${latestMainStage}-${latestStage}-${latestSubStage}`] = (subStageCounts[`${latestMainStage}-${latestStage}-${latestSubStage}`] || 0) + 1;

  //             mainStageDetails.push({ mainStage: latestMainStage, doc });
  //             stageDetails.push({ mainStage: latestMainStage, stage: latestStage, doc });
  //             subStageDetails.push({ mainStage: latestMainStage, stage: latestStage, subStage: latestSubStage, doc });
  //           }
  //         }
  //       });

  //       mainStageList.forEach((mainStage) => {
  //         if (!(mainStage in mainStageCounts)) {
  //           mainStageCounts[mainStage] = 0;
  //         }
  //       });

  //       const mainStageCountsArray = Array.from(mainStageList).map((mainStage) => ({
  //         mainStage,
  //         count: mainStageCounts[mainStage],
  //       }));

  //       const stageCountsArray = Object.keys(stageCounts).map((key) => {
  //         const [mainStage, stage] = key.split("-");
  //         return {
  //           mainStage,
  //           stage,
  //           count: stageCounts[key],
  //         };
  //       });

  //       const subStageCountsArray = Object.keys(subStageCounts).map((key) => {
  //         const [mainStage, stage, subStage] = key.split("-");
  //         return {
  //           mainStage,
  //           stage,
  //           subStage,
  //           count: subStageCounts[key],
  //         };
  //       });

  //       console.log("Main Stage Counts Array:", mainStageCountsArray);
  //       mainStageCountsArray.forEach(({ mainStage, count }) => {
  //         console.log(`Main Stage: ${mainStage}, Count: ${count}`);
  //         Object.keys(stageCounts).forEach((key) => {
  //           if (key.startsWith(`${mainStage}-`)) {
  //             const [, stage] = key.split("-");
  //             console.log(`  Stage: ${stage}, Count: ${stageCounts[key]}`);
  //             Object.keys(subStageCounts).forEach((subKey) => {
  //               if (subKey.startsWith(`${mainStage}-${stage}-`)) {
  //                 const [, , subStage] = subKey.split("-");
  //                 console.log(`    Sub-Stage: ${subStage}, Count: ${subStageCounts[subKey]}`);
  //               }
  //             });
  //           }
  //         });
  //       });

  //       console.log("Total Leads:", allData.length);

  //       resolve({
  //         mainStageCounts: mainStageCountsArray,
  //         stageCounts: stageCountsArray,
  //         subStageCounts: subStageCountsArray,
  //         totalLeads: allData.length,
  //         mainStageDetails,
  //         stageDetails,
  //         subStageDetails,
  //       });
  //     } catch (error) {
  //       console.error("Error in getLeadStatusCounts:", error);
  //       reject(error);
  //     }
  //   });
  // },

  getLeadStatusCounts: async (
    sessionEmail,
    startDate,
    endDate,
    filterType,
    selectedStage,
    showLatestSubstage = false
  ) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log("Lead Owner Email for Count:", sessionEmail);
        console.log("Received startDate:", startDate);
        console.log("Received endDate:", endDate);
        console.log("Received filterType:", filterType);
        console.log("Received stage:", selectedStage);
        console.log("Show Latest Substage:", showLatestSubstage);

        // Parse startDate and endDate
        const start = startDate
          ? new Date(startDate).setHours(0, 0, 0, 0)
          : null;
        const end = endDate
          ? new Date(endDate).setHours(23, 59, 59, 999)
          : null;

        if ((startDate && !start) || (endDate && !end)) {
          throw new Error("Invalid date value provided");
        }

        let matchCriteria = { leadOwnerName: sessionEmail };

        // Fetch data
        const [googleSheetData, referralData] = await Promise.all([
          db
            .get()
            .collection(collection.GOOGLESHEETS_COLLECTION)
            .find(matchCriteria)
            .toArray(),
          db
            .get()
            .collection(collection.REFERRAL_COLLECTION)
            .find(matchCriteria)
            .toArray(),
        ]);

        const allData = [...googleSheetData, ...referralData];

        let mainStageCounts = {};
        let stageCounts = {};
        let subStageCounts = {};
        let mainStageList = new Set();

        let mainStageDetails = [];
        let stageDetails = [];
        let subStageDetails = [];

        allData.forEach((doc) => {
          console.log("Processing document:", doc);

          let latestMainStage = null;
          let latestStage = null;
          let latestSubStage = null;
          let latestDate = null;

          for (const [mainStage, stages] of Object.entries(
            doc.leadStatus || {}
          )) {
            if (!["In Progress", "Completed"].includes(mainStage)) {
              mainStageList.add(mainStage);
            }
            if (filterType && filterType !== mainStage) continue;

            for (const [stage, entries] of Object.entries(stages)) {
              if (selectedStage && selectedStage !== stage) continue;

              const filteredEntries = entries.filter((entry) => {
                const entryDate = new Date(entry.date).getTime();
                return entryDate >= start && entryDate <= end;
              });

              console.log(
                `Filtered Entries for ${mainStage} - ${stage}:`,
                filteredEntries
              );

              if (filteredEntries.length === 0) continue;

              const latest = filteredEntries.reduce((latest, entry) => {
                const entryDate = new Date(entry.date).getTime();
                if (isNaN(entryDate)) {
                  console.warn("Invalid date found in entry:", entry);
                  return latest;
                }
                return !latest || entryDate > new Date(latest.date).getTime()
                  ? entry
                  : latest;
              }, null);

              console.log(`Latest Entry for ${mainStage} - ${stage}:`, latest);

              if (
                latest &&
                (!latestDate || new Date(latest.date) > new Date(latestDate))
              ) {
                latestDate = latest.date;
                latestMainStage = mainStage;
                latestStage = stage;
                latestSubStage = latest.subStage;
              }
            }
          }

          if (showLatestSubstage && latestDate) {
            if (latestMainStage) {
              mainStageCounts[latestMainStage] =
                (mainStageCounts[latestMainStage] || 0) + 1;
              stageCounts[`${latestMainStage}-${latestStage}`] =
                (stageCounts[`${latestMainStage}-${latestStage}`] || 0) + 1;
              subStageCounts[
                `${latestMainStage}-${latestStage}-${latestSubStage}`
              ] =
                (subStageCounts[
                  `${latestMainStage}-${latestStage}-${latestSubStage}`
                ] || 0) + 1;

              mainStageDetails.push({ mainStage: latestMainStage, doc });
              stageDetails.push({
                mainStage: latestMainStage,
                stage: latestStage,
                doc,
              });
              subStageDetails.push({
                mainStage: latestMainStage,
                stage: latestStage,
                subStage: latestSubStage,
                doc,
              });
            }
          }
        });

        // Ensure all main stages, stages, and sub-stages are shown even if counts are zero
        mainStageList.forEach((mainStage) => {
          if (!(mainStage in mainStageCounts)) {
            mainStageCounts[mainStage] = 0;
          }
          for (const stage of Object.keys(stageCounts)) {
            if (stage.startsWith(`${mainStage}-`) && !(stage in stageCounts)) {
              stageCounts[stage] = 0;
            }
            for (const subStage of Object.keys(subStageCounts)) {
              if (
                subStage.startsWith(`${mainStage}-${stage}-`) &&
                !(subStage in subStageCounts)
              ) {
                subStageCounts[subStage] = 0;
              }
            }
          }
        });

        // Convert counts to arrays and sort
        const mainStageCountsArray = Array.from(mainStageList)
          .map((mainStage) => ({
            mainStage,
            count: mainStageCounts[mainStage],
          }))
          .sort((a, b) => b.count - a.count);

        const stageCountsArray = Object.keys(stageCounts)
          .map((key) => {
            const [mainStage, stage] = key.split("-");
            return {
              mainStage,
              stage,
              count: stageCounts[key],
            };
          })
          .sort((a, b) => b.count - a.count);

        const subStageCountsArray = Object.keys(subStageCounts)
          .map((key) => {
            const [mainStage, stage, subStage] = key.split("-");
            return {
              mainStage,
              stage,
              subStage,
              count: subStageCounts[key],
            };
          })
          .sort((a, b) => b.count - a.count);

        console.log("Main Stage Counts Array:", mainStageCountsArray);
        console.log("Stage Counts Array:", stageCountsArray);
        console.log("Sub-Stage Counts Array:", subStageCountsArray);

        console.log("Total Leads:", allData.length);

        const documents = allData.map((doc) => {
          return {
            _id: doc._id,
            course: doc.course,
            specialization: doc.specialization,
            status: doc.status,
            experience: doc.experience,
            currSalary: doc.currSalary,
            prevUniversity: doc.prevUniversity,
            exposure: doc.exposure,
            budget: doc.budget,
            description: doc.description,
            name: doc.name,
            email: doc.email,
            whatsapp: doc.whatsapp,
            mobile: doc.mobile,
            state: doc.state,
            city: doc.city,
            ReferredBy: doc.ReferredBy,
            timeStamp: doc.timeStamp,
            assignDate: doc.assignDate,
            assignLead: doc.assignLead,
            leadOwnerName: doc.leadOwnerName,
            leadStatus: doc.leadStatus,
          };
        });

        resolve({
          mainStageCounts: mainStageCountsArray.map((mainStageCount) => ({
            ...mainStageCount,
            documents: mainStageDetails
              .filter((detail) => detail.mainStage === mainStageCount.mainStage)
              .map((detail) => detail.doc),
          })),
          stageCounts: stageCountsArray.map((stageCount) => ({
            ...stageCount,
            documents: stageDetails
              .filter(
                (detail) =>
                  detail.mainStage === stageCount.mainStage &&
                  detail.stage === stageCount.stage
              )
              .map((detail) => detail.doc),
          })),
          subStageCounts: subStageCountsArray.map((subStageCount) => ({
            ...subStageCount,
            documents: subStageDetails
              .filter(
                (detail) =>
                  detail.mainStage === subStageCount.mainStage &&
                  detail.stage === subStageCount.stage &&
                  detail.subStage === subStageCount.subStage
              )
              .map((detail) => detail.doc),
          })),
          totalLeads: allData.length,
          documents, // Return all documents
        });
      } catch (error) {
        console.error("Error in getLeadStatusCounts:", error);
        reject(error);
      }
    });
  },

  // getLeadStatusCounts: async (
  //   sessionEmail,
  //   startDate,
  //   endDate,
  //   filterType,
  //   selectedStage,
  //   showLatestSubstage = false // Flag to control showing the latest substage
  // ) => {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       console.log("Lead Owner Email for Count:", sessionEmail);
  //       console.log("Received startDate:", startDate);
  //       console.log("Received endDate:", endDate);
  //       console.log("Received filterType:", filterType);
  //       console.log("Received stage:", selectedStage);
  //       console.log("Show Latest Substage:", showLatestSubstage);

  //       const start = startDate
  //         ? new Date(startDate).toISOString().split("T")[0]
  //         : null;
  //       const end = endDate
  //         ? new Date(endDate).toISOString().split("T")[0]
  //         : null;

  //       console.log("Parsed startDate:", start);
  //       console.log("Parsed endDate:", end);

  //       let matchCriteria = { leadOwnerName: sessionEmail };

  //       const [googleSheetData, referralData] = await Promise.all([
  //         db
  //           .get()
  //           .collection(collection.GOOGLESHEETS_COLLECTION)
  //           .find(matchCriteria)
  //           .toArray(),
  //         db
  //           .get()
  //           .collection(collection.REFERRAL_COLLECTION)
  //           .find(matchCriteria)
  //           .toArray(),
  //       ]);

  //       const allData = [...googleSheetData, ...referralData];

  //       let mainStageCounts = {};
  //       let stageCounts = {};
  //       let subStageCounts = {};
  //       let mainStageList = new Set();

  //       allData.forEach((doc) => {
  //         console.log("Processing document:", doc); // Log raw data for each document

  //         let latestMainStage = null;
  //         let latestStage = null;
  //         let latestSubStage = null;
  //         let latestDate = null;

  //         for (const [mainStage, stages] of Object.entries(
  //           doc.leadStatus || {}
  //         )) {
  //           // Collect unique main stages
  //           if (!["In Progress", "Completed"].includes(mainStage)) {
  //             mainStageList.add(mainStage);
  //           }
  //           if (filterType && filterType !== mainStage) continue;

  //           for (const [stage, entries] of Object.entries(stages)) {
  //             if (selectedStage && selectedStage !== stage) continue;

  //             const latest = entries.reduce((latest, entry) => {
  //               return !latest || new Date(entry.date) > new Date(latest.date)
  //                 ? entry
  //                 : latest;
  //             }, null);

  //             if (!latestDate || new Date(latest.date) > new Date(latestDate)) {
  //               latestDate = latest.date;
  //               latestMainStage = mainStage;
  //               latestStage = stage;
  //               latestSubStage = latest.subStage;
  //             }
  //           }
  //         }

  //         if (showLatestSubstage && latestDate) {
  //           if (latestMainStage) {
  //             mainStageCounts[latestMainStage] =
  //               (mainStageCounts[latestMainStage] || 0) + 1;
  //             stageCounts[`${latestMainStage}-${latestStage}`] =
  //               (stageCounts[`${latestMainStage}-${latestStage}`] || 0) + 1;
  //             subStageCounts[
  //               `${latestMainStage}-${latestStage}-${latestSubStage}`
  //             ] =
  //               (subStageCounts[
  //                 `${latestMainStage}-${latestStage}-${latestSubStage}`
  //               ] || 0) + 1;
  //           }
  //         }
  //       });

  //       // Ensure all main stages from the mainStageList are included in the output
  //       mainStageList.forEach((mainStage) => {
  //         if (!(mainStage in mainStageCounts)) {
  //           mainStageCounts[mainStage] = 0;
  //         }
  //       });

  //       // Convert counts to arrays
  //       const mainStageCountsArray = Array.from(mainStageList).map(
  //         (mainStage) => ({
  //           mainStage,
  //           count: mainStageCounts[mainStage],
  //         })
  //       );

  //       const stageCountsArray = Object.keys(stageCounts).map((key) => {
  //         const [mainStage, stage] = key.split("-");
  //         return {
  //           mainStage,
  //           stage,
  //           count: stageCounts[key],
  //         };
  //       });

  //       const subStageCountsArray = Object.keys(subStageCounts).map((key) => {
  //         const [mainStage, stage, subStage] = key.split("-");
  //         return {
  //           mainStage,
  //           stage,
  //           subStage,
  //           count: subStageCounts[key],
  //         };
  //       });

  //       // Log detailed information about the counts
  //       console.log("Main Stage Counts Array:", mainStageCountsArray);
  //       mainStageCountsArray.forEach(({ mainStage, count }) => {
  //         console.log(`Main Stage: ${mainStage}, Count: ${count}`);
  //         Object.keys(stageCounts).forEach((key) => {
  //           if (key.startsWith(`${mainStage}-`)) {
  //             const [_, stage] = key.split("-");
  //             console.log(`  Stage: ${stage}, Count: ${stageCounts[key]}`);
  //             Object.keys(subStageCounts).forEach((subKey) => {
  //               if (subKey.startsWith(`${mainStage}-${stage}-`)) {
  //                 const [_, __, subStage] = subKey.split("-");
  //                 console.log(
  //                   `    Sub-Stage: ${subStage}, Count: ${subStageCounts[subKey]}`
  //                 );
  //               }
  //             });
  //           }
  //         });
  //       });

  //       console.log("Total Leads:", allData.length);

  //       resolve({
  //         mainStageCounts: mainStageCountsArray,
  //         stageCounts: stageCountsArray,
  //         subStageCounts: subStageCountsArray,
  //         totalLeads: allData.length,
  //       });
  //     } catch (error) {
  //       console.error("Error in getLeadStatusCounts:", error);
  //       reject(error);
  //     }
  //   });
  // },

  // getLeadStatusCounts: async (sessionEmail, startDate, endDate, filterType) => {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       console.log("Lead Owner Email for Count:", sessionEmail);
  //       console.log("Received startDate:", startDate);
  //       console.log("Received endDate:", endDate);
  //       console.log("Received filterType:", filterType);

  //       // Parse the start and end dates
  //       const start = startDate
  //         ? new Date(startDate).toISOString().split("T")[0]
  //         : null;
  //       const end = endDate
  //         ? new Date(endDate).toISOString().split("T")[0]
  //         : null;

  //       console.log("Parsed startDate:", start);
  //       console.log("Parsed endDate:", end);

  //       let matchCriteria = { leadOwnerName: sessionEmail };

  //       const [googleSheetData, referralData, stages] = await Promise.all([
  //         db
  //           .get()
  //           .collection(collection.GOOGLESHEETS_COLLECTION)
  //           .find(matchCriteria)
  //           .toArray(),
  //         db
  //           .get()
  //           .collection(collection.REFERRAL_COLLECTION)
  //           .find(matchCriteria)
  //           .toArray(),
  //         db
  //           .get()
  //           .collection(collection.LEADSTAGE_COLLECTION)
  //           .find({})
  //           .toArray(),
  //       ]);

  //       const allData = [...googleSheetData, ...referralData];

  //       const leadStatusCounts = {};
  //       const stageCounts = {};
  //       const subStageCounts = {};

  //       allData.forEach((doc) => {
  //         for (const [mainStage, stages] of Object.entries(
  //           doc.leadStatus || {}
  //         )) {
  //           if (
  //             filterType &&
  //             filterType !== mainStage &&
  //             filterType !== "Unique"
  //           )
  //             continue;

  //           Object.entries(stages).forEach(([stage, entries]) => {
  //             if (!leadStatusCounts[mainStage]) {
  //               leadStatusCounts[mainStage] = { count: 0, stages: {} };
  //             }
  //             if (!leadStatusCounts[mainStage].stages[stage]) {
  //               leadStatusCounts[mainStage].stages[stage] = {
  //                 count: 0,
  //                 subStages: {},
  //               };
  //             }

  //             let latestEntry = entries.reduce((latest, current) => {
  //               const currentDate = new Date(current.date);
  //               return currentDate > new Date(latest.date) ? current : latest;
  //             });

  //             if (!stageCounts[mainStage]) {
  //               stageCounts[mainStage] = {};
  //             }
  //             if (!stageCounts[mainStage][stage]) {
  //               stageCounts[mainStage][stage] = 0;
  //             }

  //             const entryDate = latestEntry.date
  //               ? latestEntry.date.split("T")[0]
  //               : null;
  //             if (
  //               entryDate &&
  //               (!start || entryDate >= start) &&
  //               (!end || entryDate <= end)
  //             ) {
  //               leadStatusCounts[mainStage].count += 1;
  //               leadStatusCounts[mainStage].stages[stage].count += 1;
  //               stageCounts[mainStage][stage] += 1;

  //               if (!subStageCounts[mainStage]) {
  //                 subStageCounts[mainStage] = {};
  //               }
  //               if (!subStageCounts[mainStage][stage]) {
  //                 subStageCounts[mainStage][stage] = {};
  //               }
  //               if (!subStageCounts[mainStage][stage][latestEntry.subStage]) {
  //                 subStageCounts[mainStage][stage][latestEntry.subStage] = 0;
  //               }
  //               subStageCounts[mainStage][stage][latestEntry.subStage] += 1;
  //             }
  //           });
  //         }
  //       });

  //       const stagesAndSubStages = stages.reduce((acc, stage) => {
  //         if (Array.isArray(stage.substage)) {
  //           acc.push({
  //             mainStage: stage.mainStage,
  //             stage: stage.stage,
  //             substage: stage.substage,
  //           });
  //         } else {
  //           console.error(
  //             `Stages data for main stage "${stage.mainStage}" is not an array:`,
  //             stage
  //           );
  //         }
  //         return acc;
  //       }, []);

  //       const totalLeads = allData.length;

  //       const mainStageCounts = Object.entries(leadStatusCounts).map(
  //         ([mainStage, { count }]) => ({ mainStage, count })
  //       );

  //       const stageCountsFlat = Object.entries(stageCounts).flatMap(
  //         ([mainStage, stages]) =>
  //           Object.entries(stages).map(([stage, count]) => ({
  //             mainStage,
  //             stage,
  //             count,
  //           }))
  //       );

  //       const subStageCountsFlat = Object.entries(subStageCounts).flatMap(
  //         ([mainStage, stages]) =>
  //           Object.entries(stages).flatMap(([stage, subStages]) =>
  //             Object.entries(subStages).map(([subStage, count]) => ({
  //               mainStage,
  //               stage,
  //               subStage,
  //               count,
  //             }))
  //           )
  //       );

  //       console.log("Main Stage Counts:", mainStageCounts);
  //       console.log("Stage Counts:", stageCountsFlat);
  //       console.log("Sub-Stage Counts:", subStageCountsFlat);
  //       console.log("Total Leads:", totalLeads);
  //       console.log(
  //         "Stages and Sub-Stages Data:",
  //         JSON.stringify(stagesAndSubStages, null, 2)
  //       );

  //       resolve({
  //         mainStageCounts,
  //         stageCounts: stageCountsFlat,
  //         subStageCounts: subStageCountsFlat,
  //         totalLeads,
  //         stagesAndSubStages,
  //       });
  //     } catch (error) {
  //       console.error("Error in getLeadStatusCounts:", error);
  //       reject(error);
  //     }
  //   });
  // },
  // getLeadStatusCounts: async (sessionEmail, startDate, endDate, filterType) => {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       console.log("Lead Owner Email for Count:", sessionEmail);
  //       console.log("Received startDate:", startDate);
  //       console.log("Received endDate:", endDate);
  //       console.log("Received filterType:", filterType);

  //       const start = startDate
  //         ? new Date(startDate).toISOString().split("T")[0]
  //         : null;
  //       const end = endDate
  //         ? new Date(endDate).toISOString().split("T")[0]
  //         : null;

  //       let matchCriteria = { leadOwnerName: sessionEmail };

  //       const [googleSheetData, referralData, stages] = await Promise.all([
  //         db
  //           .get()
  //           .collection(collection.GOOGLESHEETS_COLLECTION)
  //           .find(matchCriteria)
  //           .toArray(),
  //         db
  //           .get()
  //           .collection(collection.REFERRAL_COLLECTION)
  //           .find(matchCriteria)
  //           .toArray(),
  //         db
  //           .get()
  //           .collection(collection.LEADSTAGE_COLLECTION)
  //           .find({})
  //           .toArray(),
  //       ]);

  //       const allData = [...googleSheetData, ...referralData];

  //       const leadStatusCounts = {};
  //       const stageCounts = {};
  //       const subStageCounts = {};
  //       const uniqueCounts = {}; // New object for unique counts

  //       allData.forEach((doc) => {
  //         for (const [mainStage, stages] of Object.entries(
  //           doc.leadStatus || {}
  //         )) {
  //           if (filterType && filterType !== mainStage) continue;

  //           if (!leadStatusCounts[mainStage]) {
  //             leadStatusCounts[mainStage] = { count: 0, stages: {} };
  //           }

  //           for (const [stage, entries] of Object.entries(stages)) {
  //             if (!leadStatusCounts[mainStage].stages[stage]) {
  //               leadStatusCounts[mainStage].stages[stage] = {
  //                 count: 0,
  //                 subStages: {},
  //               };
  //             }

  //             if (!stageCounts[mainStage]) {
  //               stageCounts[mainStage] = {};
  //             }
  //             if (!stageCounts[mainStage][stage]) {
  //               stageCounts[mainStage][stage] = 0;
  //             }

  //             // Sort entries by date and pick the latest one
  //             const latestEntry = entries.reduce((latest, current) => {
  //               const currentDate = new Date(current.date);
  //               return currentDate > new Date(latest.date) ? current : latest;
  //             }, entries[0]);

  //             const entryDate = latestEntry.date
  //               ? latestEntry.date.split("T")[0]
  //               : null;

  //             if (
  //               entryDate &&
  //               (!start || entryDate >= start) &&
  //               (!end || entryDate <= end)
  //             ) {
  //               leadStatusCounts[mainStage].count += 1;
  //               leadStatusCounts[mainStage].stages[stage].count += 1;
  //               stageCounts[mainStage][stage] += 1;

  //               if (!subStageCounts[mainStage]) {
  //                 subStageCounts[mainStage] = {};
  //               }
  //               if (!subStageCounts[mainStage][stage]) {
  //                 subStageCounts[mainStage][stage] = {};
  //               }
  //               if (!subStageCounts[mainStage][stage][latestEntry.subStage]) {
  //                 subStageCounts[mainStage][stage][latestEntry.subStage] = 0;
  //               }
  //               subStageCounts[mainStage][stage][latestEntry.subStage] += 1;

  //               // For unique count, only count the latest entry
  //               if (!uniqueCounts[mainStage]) {
  //                 uniqueCounts[mainStage] = { count: 0, stages: {} };
  //               }
  //               if (!uniqueCounts[mainStage].stages[stage]) {
  //                 uniqueCounts[mainStage].stages[stage] = {
  //                   count: 0,
  //                   subStages: {},
  //                 };
  //               }
  //               uniqueCounts[mainStage].count += 1;
  //               uniqueCounts[mainStage].stages[stage].count += 1;
  //               if (
  //                 !uniqueCounts[mainStage].stages[stage].subStages[
  //                   latestEntry.subStage
  //                 ]
  //               ) {
  //                 uniqueCounts[mainStage].stages[stage].subStages[
  //                   latestEntry.subStage
  //                 ] = 0;
  //               }
  //               uniqueCounts[mainStage].stages[stage].subStages[
  //                 latestEntry.subStage
  //               ] += 1;
  //             }
  //           }
  //         }
  //       });

  //       const stagesAndSubStages = stages.reduce((acc, stage) => {
  //         if (Array.isArray(stage.substage)) {
  //           acc.push({
  //             mainStage: stage.mainStage,
  //             stage: stage.stage,
  //             substage: stage.substage,
  //           });
  //         } else {
  //           console.error(
  //             `Stages data for main stage "${stage.mainStage}" is not an array:`,
  //             stage
  //           );
  //         }
  //         return acc;
  //       }, []);

  //       const totalLeads = allData.length;

  //       const mainStageCounts = Object.entries(leadStatusCounts).map(
  //         ([mainStage, { count }]) => ({ mainStage, count })
  //       );

  //       const stageCountsFlat = Object.entries(stageCounts).flatMap(
  //         ([mainStage, stages]) =>
  //           Object.entries(stages).map(([stage, count]) => ({
  //             mainStage,
  //             stage,
  //             count,
  //           }))
  //       );

  //       const subStageCountsFlat = Object.entries(subStageCounts).flatMap(
  //         ([mainStage, stages]) =>
  //           Object.entries(stages).flatMap(([stage, subStages]) =>
  //             Object.entries(subStages).map(([subStage, count]) => ({
  //               mainStage,
  //               stage,
  //               subStage,
  //               count,
  //             }))
  //           )
  //       );

  //       const uniqueCountsFlat = Object.entries(uniqueCounts).flatMap(
  //         ([mainStage, { count, stages }]) => ({
  //           mainStage,
  //           count,
  //           stages: Object.entries(stages).flatMap(
  //             ([stage, { count, subStages }]) => ({
  //               stage,
  //               count,
  //               subStages: Object.entries(subStages).map(
  //                 ([subStage, count]) => ({
  //                   subStage,
  //                   count,
  //                 })
  //               ),
  //             })
  //           ),
  //         })
  //       );

  //       console.log("Main Stage Counts:", mainStageCounts);
  //       console.log("Stage Counts:", stageCountsFlat);
  //       console.log("Sub-Stage Counts:", subStageCountsFlat);
  //       console.log("Unique Counts:", uniqueCountsFlat); // Log unique counts
  //       console.log("Total Leads:", totalLeads);
  //       console.log(
  //         "Stages and Sub-Stages Data:",
  //         JSON.stringify(stagesAndSubStages, null, 2)
  //       );

  //       resolve({
  //         mainStageCounts,
  //         stageCounts: stageCountsFlat,
  //         subStageCounts: subStageCountsFlat,
  //         uniqueCounts: uniqueCountsFlat, // Return unique counts
  //         totalLeads,
  //         stagesAndSubStages,
  //       });
  //     } catch (error) {
  //       console.error("Error in getLeadStatusCounts:", error);
  //       reject(error);
  //     }
  //   });
  // },

  // getLeadStatusCountsok: (sessionEmail, startDate, endDate) => {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       console.log(
  //         "Lead Owner Email for Count:",
  //         sessionEmail || "All Lead Owners"
  //       );
  //       console.log("Received startDate:", startDate);
  //       console.log("Received endDate:", endDate);

  //       const start =
  //         startDate && !isNaN(Date.parse(startDate))
  //           ? new Date(startDate).toISOString().split("T")[0]
  //           : null;
  //       const end =
  //         endDate && !isNaN(Date.parse(endDate))
  //           ? new Date(endDate).toISOString().split("T")[0]
  //           : null;

  //       console.log("Parsed startDate:", start);
  //       console.log("Parsed endDate:", end);

  //       // Match criteria - if sessionEmail is null, don't filter by lead owner
  //       let matchCriteria = sessionEmail ? { leadOwnerName: sessionEmail } : {};

  //       const dateMatch =
  //         start && end
  //           ? {
  //               $match: {
  //                 "leadStatusArray.v.date": { $gte: start, $lte: end },
  //               },
  //             }
  //           : { $match: {} };

  //       const googleSheetsCounts = await db
  //         .get()
  //         .collection(collection.GOOGLESHEETS_COLLECTION)
  //         .aggregate([
  //           { $match: matchCriteria },
  //           {
  //             $project: {
  //               leadStatusArray: {
  //                 $objectToArray: "$leadStatus",
  //               },
  //             },
  //           },
  //           { $unwind: "$leadStatusArray" },
  //           dateMatch,
  //           {
  //             $group: {
  //               _id: "$leadStatusArray.k",
  //               count: { $sum: 1 },
  //             },
  //           },
  //         ])
  //         .toArray();

  //       const referralCounts = await db
  //         .get()
  //         .collection(collection.REFERRAL_COLLECTION)
  //         .aggregate([
  //           { $match: matchCriteria },
  //           {
  //             $project: {
  //               leadStatusArray: {
  //                 $objectToArray: "$leadStatus",
  //               },
  //             },
  //           },
  //           { $unwind: "$leadStatusArray" },
  //           dateMatch,
  //           {
  //             $group: {
  //               _id: "$leadStatusArray.k",
  //               count: { $sum: 1 },
  //             },
  //           },
  //         ])
  //         .toArray();

  //       const combinedCounts = [
  //         ...googleSheetsCounts,
  //         ...referralCounts,
  //       ].reduce((acc, curr) => {
  //         const status = curr._id || "UNKNOWN";
  //         acc[status] = (acc[status] || 0) + curr.count;
  //         return acc;
  //       }, {});

  //       const assignDateMatch =
  //         start && end ? { assignDate: { $gte: start, $lte: end } } : {};

  //       const totalGoogleSheetLeads = await db
  //         .get()
  //         .collection(collection.GOOGLESHEETS_COLLECTION)
  //         .countDocuments({ ...matchCriteria, ...assignDateMatch });

  //       const totalReferralLeads = await db
  //         .get()
  //         .collection(collection.REFERRAL_COLLECTION)
  //         .countDocuments({ ...matchCriteria, ...assignDateMatch });

  //       const totalLeads = totalGoogleSheetLeads + totalReferralLeads;

  //       console.log("Normalized Lead Status Counts:", combinedCounts);
  //       console.log("Total Leads:", totalLeads);

  //       resolve({ combinedCounts, totalLeads });
  //     } catch (error) {
  //       console.error("Error in getLeadStatusCounts:", error);
  //       reject(error);
  //     }
  //   });
  // },

  // getFilteredLeadCounts: (sessionEmail, startDate, endDate) => {
  //   return new Promise(async (resolve, reject) => {
  //     try {
  //       console.log("Start Date:", startDate);
  //       console.log("End Date:", endDate);
  //       console.log("Lead Owner Email:", sessionEmail);

  //       // Convert startDate and endDate to Date objects with only the date portion
  //       const start = new Date(startDate);
  //       const end = new Date(endDate);

  //       // Set the time portion of 'end' to the end of the day
  //       end.setHours(23, 59, 59, 999);

  //       console.log("Parsed Start Date:", start);
  //       console.log("Parsed End Date:", end);

  //       // Function to aggregate lead statuses and counts
  //       const aggregateLeadStatus = async (collectionName) => {
  //         return db
  //           .get()
  //           .collection(collectionName)
  //           .aggregate([
  //             {
  //               $match: {
  //                 leadOwnerName: sessionEmail,
  //                 assignDate: {
  //                   $gte: start,
  //                   $lt: end,
  //                 },
  //               },
  //             },
  //             { $project: { leadStatus: 1, assignDate: 1 } },
  //             {
  //               $unwind: {
  //                 path: "$leadStatus",
  //                 preserveNullAndEmptyArrays: true,
  //               },
  //             },
  //             {
  //               $group: {
  //                 _id: { $ifNull: ["$leadStatus.status", "UNKNOWN"] },
  //                 count: { $sum: 1 },
  //                 latestDate: { $max: "$leadStatus.date" }, // Include the latest date (date only)
  //               },
  //             },
  //           ])
  //           .toArray();
  //       };

  //       // Aggregate and log Google Sheets counts
  //       const googleSheetsCounts = await aggregateLeadStatus(
  //         collection.GOOGLESHEETS_COLLECTION
  //       );
  //       console.log("Google Sheets Counts:", googleSheetsCounts);

  //       // Count and log total Google Sheets leads
  //       const totalGoogleSheetLeads = await db
  //         .get()
  //         .collection(collection.GOOGLESHEETS_COLLECTION)
  //         .countDocuments({
  //           leadOwnerName: sessionEmail,
  //           assignDate: { $gte: start, $lt: end },
  //         });
  //       console.log("Total Google Sheets Leads:", totalGoogleSheetLeads);

  //       // Aggregate and log Referral counts
  //       const referralCounts = await aggregateLeadStatus(
  //         collection.REFERRAL_COLLECTION
  //       );
  //       console.log("Referral Counts:", referralCounts);

  //       // Count and log total Referral leads
  //       const totalReferralLeads = await db
  //         .get()
  //         .collection(collection.REFERRAL_COLLECTION)
  //         .countDocuments({
  //           leadOwnerName: sessionEmail,
  //           assignDate: { $gte: start, $lt: end },
  //         });
  //       console.log("Total Referral Leads:", totalReferralLeads);

  //       // Combine and normalize counts for lead statuses
  //       const combinedCounts = [
  //         ...googleSheetsCounts,
  //         ...referralCounts,
  //       ].reduce((acc, curr) => {
  //         acc[curr._id] = (acc[curr._id] || 0) + curr.count;
  //         return acc;
  //       }, {});

  //       // Calculate the total leads by summing the document counts from both collections
  //       const totalLeads = totalGoogleSheetLeads + totalReferralLeads;
  //       console.log("Total Leads:", totalLeads);

  //       // Resolve with combined counts and total leads
  //       resolve({ combinedCounts, totalLeads });
  //     } catch (error) {
  //       console.error("Error filtering leads:", error);
  //       reject(error);
  //     }
  //   });
  // },
  getLeadStatusCountsok: async (sessionEmail, startDate, endDate) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log("Lead Owner Email for Count:", sessionEmail);
        console.log("Received startDate:", startDate);
        console.log("Received endDate:", endDate);

        // Parse startDate and endDate
        const start = startDate
          ? new Date(startDate).setHours(0, 0, 0, 0)
          : null;
        const end = endDate
          ? new Date(endDate).setHours(23, 59, 59, 999)
          : null;

        if ((startDate && !start) || (endDate && !end)) {
          throw new Error("Invalid date value provided");
        }

        let matchCriteria = sessionEmail ? { leadOwnerName: sessionEmail } : {};

        // Fetch data
        const [googleSheetData, referralData] = await Promise.all([
          db
            .get()
            .collection(collection.GOOGLESHEETS_COLLECTION)
            .find(matchCriteria)
            .toArray(),
          db
            .get()
            .collection(collection.REFERRAL_COLLECTION)
            .find(matchCriteria)
            .toArray(),
        ]);

        const allData = [...googleSheetData, ...referralData];

        let mainStageCounts = {};
        let stageCounts = {};
        let subStageCounts = {};
        let mainStageList = new Set();

        let mainStageDetails = [];
        let stageDetails = [];
        let subStageDetails = [];

        allData.forEach((doc) => {
          console.log("Processing document:", doc);

          let latestMainStage = null;
          let latestStage = null;
          let latestSubStage = null;
          let latestDate = null;

          for (const [mainStage, stages] of Object.entries(
            doc.leadStatus || {}
          )) {
            if (!["In Progress", "Completed"].includes(mainStage)) {
              mainStageList.add(mainStage);
            }

            for (const [stage, entries] of Object.entries(stages)) {
              const filteredEntries = entries.filter((entry) => {
                const entryDate = new Date(entry.date).getTime();
                return (
                  (!start || entryDate >= start) && (!end || entryDate <= end)
                );
              });

              console.log(
                `Filtered Entries for ${mainStage} - ${stage}:`,
                filteredEntries
              );

              if (filteredEntries.length === 0) continue;

              const latest = filteredEntries.reduce((latest, entry) => {
                const entryDate = new Date(entry.date).getTime();
                if (isNaN(entryDate)) {
                  console.warn("Invalid date found in entry:", entry);
                  return latest;
                }
                return !latest || entryDate > new Date(latest.date).getTime()
                  ? entry
                  : latest;
              }, null);

              console.log(`Latest Entry for ${mainStage} - ${stage}:`, latest);

              if (
                latest &&
                (!latestDate || new Date(latest.date) > new Date(latestDate))
              ) {
                latestDate = latest.date;
                latestMainStage = mainStage;
                latestStage = stage;
                latestSubStage = latest.subStage;
              }
            }
          }

          if (latestMainStage) {
            mainStageCounts[latestMainStage] =
              (mainStageCounts[latestMainStage] || 0) + 1;
            stageCounts[`${latestMainStage}-${latestStage}`] =
              (stageCounts[`${latestMainStage}-${latestStage}`] || 0) + 1;
            subStageCounts[
              `${latestMainStage}-${latestStage}-${latestSubStage}`
            ] =
              (subStageCounts[
                `${latestMainStage}-${latestStage}-${latestSubStage}`
              ] || 0) + 1;

            mainStageDetails.push({ mainStage: latestMainStage, doc });
            stageDetails.push({
              mainStage: latestMainStage,
              stage: latestStage,
              doc,
            });
            subStageDetails.push({
              mainStage: latestMainStage,
              stage: latestStage,
              subStage: latestSubStage,
              doc,
            });
          }
        });

        // Ensure all stages and sub-stages are shown
        mainStageList.forEach((mainStage) => {
          if (!(mainStage in mainStageCounts)) {
            mainStageCounts[mainStage] = 0;
          }
          for (const stage of Object.keys(stageCounts)) {
            if (stage.startsWith(`${mainStage}-`) && !(stage in stageCounts)) {
              stageCounts[stage] = 0;
            }
            for (const subStage of Object.keys(subStageCounts)) {
              if (
                subStage.startsWith(`${mainStage}-${stage}-`) &&
                !(subStage in subStageCounts)
              ) {
                subStageCounts[subStage] = 0;
              }
            }
          }
        });

        // Convert counts to arrays and sort
        const mainStageCountsArray = Array.from(mainStageList)
          .map((mainStage) => ({
            mainStage,
            count: mainStageCounts[mainStage],
          }))
          .sort((a, b) => b.count - a.count);

        const stageCountsArray = Object.keys(stageCounts)
          .map((key) => {
            const [mainStage, stage] = key.split("-");
            return {
              mainStage,
              stage,
              count: stageCounts[key],
            };
          })
          .sort((a, b) => b.count - a.count);

        const subStageCountsArray = Object.keys(subStageCounts)
          .map((key) => {
            const [mainStage, stage, subStage] = key.split("-");
            return {
              mainStage,
              stage,
              subStage,
              count: subStageCounts[key],
            };
          })
          .sort((a, b) => b.count - a.count);

        console.log("Main Stage Counts Array:", mainStageCountsArray);
        console.log("Stage Counts Array:", stageCountsArray);
        console.log("Sub-Stage Counts Array:", subStageCountsArray);

        console.log("Total Leads:", allData.length);

        const documents = allData.map((doc) => {
          return {
            _id: doc._id,
            course: doc.course,
            specialization: doc.specialization,
            status: doc.status,
            experience: doc.experience,
            currSalary: doc.currSalary,
            prevUniversity: doc.prevUniversity,
            exposure: doc.exposure,
            budget: doc.budget,
            description: doc.description,
            name: doc.name,
            email: doc.email,
            whatsapp: doc.whatsapp,
            mobile: doc.mobile,
            state: doc.state,
            city: doc.city,
            ReferredBy: doc.ReferredBy,
            timeStamp: doc.timeStamp,
            assignDate: doc.assignDate,
            assignLead: doc.assignLead,
            leadOwnerName: doc.leadOwnerName,
            leadStatus: doc.leadStatus,
          };
        });

        resolve({
          mainStageCounts: mainStageCountsArray.map((mainStageCount) => ({
            ...mainStageCount,
            documents: mainStageDetails
              .filter((detail) => detail.mainStage === mainStageCount.mainStage)
              .map((detail) => detail.doc),
          })),
          stageCounts: stageCountsArray.map((stageCount) => ({
            ...stageCount,
            documents: stageDetails
              .filter(
                (detail) =>
                  detail.mainStage === stageCount.mainStage &&
                  detail.stage === stageCount.stage
              )
              .map((detail) => detail.doc),
          })),
          subStageCounts: subStageCountsArray.map((subStageCount) => ({
            ...subStageCount,
            documents: subStageDetails
              .filter(
                (detail) =>
                  detail.mainStage === subStageCount.mainStage &&
                  detail.stage === subStageCount.stage &&
                  detail.subStage === subStageCount.subStage
              )
              .map((detail) => detail.doc),
          })),
          totalLeads: allData.length,
          documents, // Return all documents
        });
      } catch (error) {
        console.error("Error in getLeadStatusCountsok:", error);
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

  updateLeadStatus: async (id, mainStage, leadStage, statusObj) => {
    return new Promise(async (resolve, reject) => {
      try {
        const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };

        // Fetch existing lead data
        const [googlesheet, referral] = await Promise.all([
          db
            .get()
            .collection(collection.GOOGLESHEETS_COLLECTION)
            .findOne(query),
          db.get().collection(collection.REFERRAL_COLLECTION).findOne(query),
        ]);

        // Merge existing statuses and update with the new status
        const currentStatus =
          googlesheet?.leadStatus || referral?.leadStatus || {};
        const mainStageData = currentStatus[mainStage] || {};
        const stagesArray = mainStageData[leadStage] || [];

        // Append the new status object to the array of stages
        stagesArray.push(statusObj);
        mainStageData[leadStage] = stagesArray;
        currentStatus[mainStage] = mainStageData;

        // Prepare history object
        const historyEntry = {
          status: statusObj.status,
          subStage: statusObj.subStage,
          date: statusObj.date,
          followUp: statusObj.followUp || null,
        };

        const historyData = googlesheet?.history || referral?.history || {};
        const historyArray = historyData[leadStage] || [];
        historyArray.push(historyEntry);
        historyData[leadStage] = historyArray;

        // Update the collections with the new leadStatus and history
        await Promise.all([
          db
            .get()
            .collection(collection.GOOGLESHEETS_COLLECTION)
            .updateOne(query, {
              $set: {
                leadStatus: currentStatus,
                history: historyData,
              },
            }),
          db
            .get()
            .collection(collection.REFERRAL_COLLECTION)
            .updateOne(query, {
              $set: {
                leadStatus: currentStatus,
                history: historyData,
              },
            }),
        ]);

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  getLeadDetails: async (mainStage, stage, subStage) => {
    try {
      const matchCriteria = {
        ...(mainStage && { mainStage }),
        ...(stage && { stage }),
        ...(subStage && { subStage }),
      };

      const [googlesheetsData, referralData] = await Promise.all([
        db
          .get()
          .collection(collection.GOOGLESHEETS_COLLECTION)
          .find(matchCriteria)
          .toArray(),
        db
          .get()
          .collection(collection.REFERRAL_COLLECTION)
          .find(matchCriteria)
          .toArray(),
      ]);

      return [...googlesheetsData, ...referralData]; // Combine or process data as needed
    } catch (error) {
      throw new Error("Error fetching lead details: " + error.message);
    }
  },

  getSubStageMandatoryStatus: async (stage, subStage) => {
    try {
      const leadStage = await db
        .get()
        .collection(collection.LEADSTAGE_COLLECTION)
        .findOne({ stage });

      if (leadStage) {
        const subStageInfo = leadStage.substage.find(
          (s) => s.name === subStage
        );
        const isMandatory = subStageInfo ? subStageInfo.mandatory : false;
        return { success: true, isMandatory };
      } else {
        return { success: false, message: "Lead stage not found" };
      }
    } catch (error) {
      console.error("Error fetching sub-stage mandatory status:", error);
      return { success: false, message: "An error occurred" };
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
  // Helper function
  getAllPatnerTrack: (instituteid) => {
    return new Promise(async (resolve, reject) => {
      try {
        let referredBy = await db
          .get()
          .collection(collection.CLIENT_COLLECTION)
          .find({ referredBy: instituteid }) // Match referredBy with instituteid
          .toArray();
        resolve(referredBy);
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
      const database = db.get(); // Get the database connection
      const partnersCollection = database.collection(
        collection.AFFILIATE_COLLECTION
      );

      // Define the base part of the institute ID
      const baseInstituteId = "IEHAP";

      // Find the highest numeric suffix across all institute IDs
      const latestPartner = await partnersCollection
        .find({ instituteid: { $regex: `^${baseInstituteId}-\\d{5}$` } })
        .sort({ instituteid: -1 })
        .limit(1)
        .toArray();

      let nextInstituteId;
      if (latestPartner.length > 0) {
        // Extract the highest numeric part and increment it
        const latestNumber = parseInt(
          latestPartner[0].instituteid.split("-").pop(),
          10
        );
        nextInstituteId = `${baseInstituteId}-${(latestNumber + 1)
          .toString()
          .padStart(5, "0")}`;
      } else {
        // Start with the first number if no previous IDs are found
        nextInstituteId = `${baseInstituteId}-00313`;
      }

      // Ensure the new institute ID is unique across all records
      let existingPartner = await partnersCollection.findOne({
        instituteid: nextInstituteId,
      });

      while (existingPartner) {
        // If the generated ID is already taken, increment the number
        const newNumber = parseInt(nextInstituteId.split("-").pop(), 10) + 1;
        nextInstituteId = `${baseInstituteId}-${newNumber
          .toString()
          .padStart(5, "0")}`;
        existingPartner = await partnersCollection.findOne({
          instituteid: nextInstituteId,
        });
      }

      // Check if the email already exists
      const emailExists = await partnersCollection.findOne({
        email: formData.email,
      });
      if (emailExists) {
        return { success: false, message: "Email already exists" };
      }

      // Hash the password before storing it
      const hashedPassword = await bcrypt.hash(formData.password, 10);

      // Create a new partner document with the updated fields
      const newPartner = {
        name: formData.name,
        email: formData.email,
        mobNumber: formData.mobile_number,
        workingStatus: formData.working_status,
        position: formData.position,
        presentCompany: formData.present_company,
        state: formData.state,
        city: formData.city,
        password: hashedPassword,
        instituteid: nextInstituteId,
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

      // Generate the base institute ID using the first 4 letters of the institute name
      const baseInstituteId =
        "IEHP" +
        formData.institute_name
          .replace(/\s+/g, "") // Remove spaces
          .substring(0, 4) // Get the first 4 characters
          .toUpperCase();

      let nextInstituteId;
      let isUnique = false;

      // Fetch all institute IDs and find the highest numeric part globally
      const allPartners = await partnersCollection.find({}).toArray();
      const highestCounter = allPartners.reduce((max, partner) => {
        const numberPart = parseInt(partner.instituteid.split("-")[1], 10);
        return numberPart > max ? numberPart : max;
      }, 786); // Start from 786 if no records are found

      // Increment the counter
      let counter = highestCounter + 1;

      while (!isUnique) {
        // Generate the next institute ID using the global highest counter
        nextInstituteId = `${baseInstituteId}-${counter
          .toString()
          .padStart(5, "0")}`;

        // Check if the generated institute ID already exists
        const existingInstitute = await partnersCollection.findOne({
          instituteid: nextInstituteId,
        });

        if (!existingInstitute) {
          isUnique = true; // ID is unique, exit the loop
        } else {
          counter++; // Increment the number and try again
        }
      }

      // Check if the email already exists
      const existingPartner = await partnersCollection.findOne({
        email: formData.email,
      });

      if (existingPartner) {
        return { success: false, message: "Email already exists" };
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

      let newStudentId = "";
      const defaultPrefixIEHP = "IEHP"; // Default prefix for IEHP-prefixed IDs
      const defaultStartIdIEHP = 3001; // Default starting ID for IEHP-prefixed IDs
      const defaultPrefixIEH = "IEH"; // Default prefix for non-IEHP IDs
      const defaultStartIdIEH = 5786; // Default starting ID for non-IEHP IDs
      let lastIdNum = defaultStartIdIEH; // Initialize starting ID for non-IEHP

      // Determine the prefix and starting ID based on referredBy
      if (client.referredBy && client.referredBy.startsWith("IEHP")) {
        // Extract the prefix after "IEHP" (e.g., "IEHPVNWA" or "IEHPANWA")
        const referredPrefix = client.referredBy.split("-")[0]; // Get the prefix before the dash
        const prefix = referredPrefix ? referredPrefix : defaultPrefixIEHP;

        // Find the last client with any IEHP prefix
        const maxClient = await clientsCollection
          .find({ studentid: { $regex: `^IEHP.*-` } }) // Match any studentid starting with "IEHP"
          .sort({ studentid: -1 })
          .limit(1)
          .toArray();

        if (maxClient.length > 0) {
          // Extract the last number used in the studentid
          const lastIdMatch = maxClient[0].studentid.match(/IEHP.*-(\d+)$/);
          lastIdNum = lastIdMatch
            ? parseInt(lastIdMatch[1], 10)
            : defaultStartIdIEHP;
        }

        // Generate the new student ID by incrementing the last number
        newStudentId = `${prefix}-${lastIdNum + 1}`;
      } else {
        // Handle the case for non-IEHP referredBy (default to IEH prefix)
        const prefix = defaultPrefixIEH;

        // Find the last client with the IEH prefix
        const lastClient = await clientsCollection
          .find({ studentid: { $regex: `^IEH-` } }) // Match any studentid starting with "IEH"
          .sort({ studentid: -1 })
          .limit(1)
          .toArray();

        if (lastClient.length > 0) {
          // Extract the last number used in the studentid
          const lastIdMatch = lastClient[0].studentid.match(/^IEH-(\d+)$/);
          lastIdNum = lastIdMatch
            ? parseInt(lastIdMatch[1], 10)
            : defaultStartIdIEH;
        }

        // Generate the new student ID by incrementing the last number
        newStudentId = `${prefix}-${lastIdNum + 1}`;
      }

      // Log the generated student ID for debugging
      console.log("Generated new student ID:", newStudentId);

      // Add the new student ID to the client object
      client.studentid = newStudentId;

      // Insert the client with the new student ID
      const result = await clientsCollection.insertOne(client);

      console.log("Client inserted:", result);
      callback(result.insertedId, null);
    } catch (error) {
      console.error("Error adding client:", error);
      callback(null, error.message);
    }
  },
  addClienttemp: async (client, callback) => {
    try {
      const database = db.get();
      const clientsCollection = database.collection("clienttemp");

      // Check if mobile number or email already exists
      const existingClient = await clientsCollection.findOne({
        $or: [{ mobile: client.mobile }, { email: client.email }],
      });

      if (existingClient) {
        return callback(null, "Mobile number or email already exists");
      }

      let newStudentId = "";
      const defaultPrefixIEHP = "IEHP"; // Default prefix for IEHP-prefixed IDs
      const defaultStartIdIEHP = 3001; // Default starting ID for IEHP-prefixed IDs
      const defaultPrefixIEH = "IEH"; // Default prefix for non-IEHP IDs
      const defaultStartIdIEH = 5643; // Default starting ID for non-IEHP IDs
      let lastIdNum = defaultStartIdIEH; // Initialize starting ID for non-IEHP

      // Determine the prefix and starting ID based on referredBy
      if (client.referredBy && client.referredBy.startsWith("IEHP")) {
        // Extract the prefix after "IEHP" (e.g., "IEHPVNWA" or "IEHPANWA")
        const referredPrefix = client.referredBy.split("-")[0]; // Get the prefix before the dash
        const prefix = referredPrefix ? referredPrefix : defaultPrefixIEHP;

        // Find the last client with any IEHP prefix
        const maxClient = await clientsCollection
          .find({ studentid: { $regex: `^IEHP.*-` } }) // Match any studentid starting with "IEHP"
          .sort({ studentid: -1 })
          .limit(1)
          .toArray();

        if (maxClient.length > 0) {
          // Extract the last number used in the studentid
          const lastIdMatch = maxClient[0].studentid.match(/IEHP.*-(\d+)$/);
          lastIdNum = lastIdMatch
            ? parseInt(lastIdMatch[1], 10)
            : defaultStartIdIEHP;
        }

        // Generate the new student ID by incrementing the last number
        newStudentId = `${prefix}-${lastIdNum + 1}`;
      } else {
        // Handle the case for non-IEHP referredBy (default to IEH prefix)
        const prefix = defaultPrefixIEH;

        // Find the last client with the IEH prefix
        const lastClient = await clientsCollection
          .find({ studentid: { $regex: `^IEH-` } }) // Match any studentid starting with "IEH"
          .sort({ studentid: -1 })
          .limit(1)
          .toArray();

        if (lastClient.length > 0) {
          // Extract the last number used in the studentid
          const lastIdMatch = lastClient[0].studentid.match(/^IEH-(\d+)$/);
          lastIdNum = lastIdMatch
            ? parseInt(lastIdMatch[1], 10)
            : defaultStartIdIEH;
        }

        // Generate the new student ID by incrementing the last number
        newStudentId = `${prefix}-${lastIdNum + 1}`;
      }

      // Log the generated student ID for debugging
      console.log("Generated new student ID:", newStudentId);

      // Add the new student ID to the client object
      client.studentid = newStudentId;

      // Insert the client with the new student ID
      const result = await clientsCollection.insertOne(client);

      console.log("Client inserted:", result);
      callback(result.insertedId, null);
    } catch (error) {
      console.error("Error adding client:", error);
      callback(null, error.message);
    }
  },
  saveAllClientDetails: async (allData) => {
    try {
      const insertPromises = allData.map(async (client) => {
        // Optionally, hash passwords if they exist
        if (client.password) {
          client.password = await bcrypt.hash(client.password, saltRounds);
        }

        // Insert the client data into the database
        return db
          .get()
          .collection(collection.CLIENT_COLLECTION)
          .insertOne(client);
      });

      // Wait for all insertions to complete
      const result = await Promise.all(insertPromises);

      return result;
    } catch (error) {
      console.error("Error saving all client details:", error);
      throw new Error("Error saving all client details");
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
  updateClientDetailsa: async (id, updates) => {
    try {
      const result = await db
        .get()
        .collection(collection.CLIENT_COLLECTION)
        .updateOne(
          { _id: ObjectId(id) },
          { $set: updates } // $set should be used here to update fields
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
