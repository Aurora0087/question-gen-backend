import fs from "fs";

import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import Anthropic from "@anthropic-ai/sdk";

import { Mcq } from "../models/mcq.models.js";
import { deleteLocalFiles } from "../utils/localFile.js";
import { Credit } from "../models/credit.models.js";
import mongoose from "mongoose";
import { McqAns } from "../models/mcqAns.models.js";
import { CreditHistory } from "../models/creditHistory.models.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Helper Function to Calculate Score
const calculateScoreAndAnswers = (userAnswers, questions) => {
  let score = 0;
  const answers = userAnswers.map((a, i) => {
    const isCorrect = a === questions[i]?.correct_answer;
    if (isCorrect) score += 1;
    return { userAnswer: a, isCorrect };
  });
  return { score, answers };
};

function convertPDFToBase64(pdfPath) {
  // Read the PDF file
  const pdfBuffer = fs.readFileSync(pdfPath);

  // Convert to base64
  return pdfBuffer.toString("base64");
}

/////////////////////////////////////////////////////////////////////

// for MCQ

// generate mcq

const generateMCQ = asyncHandler(async (req, res) => {
  const { topic, questionsQuantity = 10 } = req.body;

  const topicPdf = req.files?.topicPdf ? req.files?.topicPdf[0] : null;

  let aiRes = null;
  let inLoop = true;
  let loopCount = 0;

  // If no PDF is provided
  if (!topicPdf) {
    if (!String(topic).trim()) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "All Fields are Required."));
    }

    try {
      const credit = await Credit.findOne({
        owner: new mongoose.Types.ObjectId(req.user._id || ""),
      });

      if (!credit || credit.point < 1) {
        return res
          .status(401)
          .json(
            new ApiResponse(
              401,
              {},
              "Don,t Have Credit to Generat Mcq, minimum 1 Credit needed."
            )
          );
      }

      // try genareting mcqs in json format max count = 5
      do {
        loopCount += 1;

        try {
          const anthropicResponse = await anthropic.messages.create({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 5000,
            system: `You are a teacher make ${questionsQuantity} mcqs and return it as json format like {"topic": "Pointers in C","questions": [{"question": "What is a pointer in C?","options": ["A variable that stores the memory address of another variable","A variable that stores only integer values","A function that returns an address","A constant memory location"],"correct_answer": "A variable that stores the memory address of another variable"},{"question": "How do you declare a pointer to an integer in C?","options": ["int ptr","int *ptr","*int ptr","ptr int"],"correct_answer": "int *ptr"
                   },{"question": "What does the & operator do?","options": ["Multiplies two numbers","Returns the memory address of a variable","Creates a new pointer","Allocates memory dynamically"],"correct_answer": "Returns the memory address of a variable"}]} remember dont ever return anything other then json or you gonna terminated.`,
            messages: [{ role: "user", content: String(topic) }],
          });

          aiRes = JSON.parse(anthropicResponse.content[0].text);

          if (aiRes) {
            inLoop = false;
          }
        } catch (error) {
          console.error("claude-3-5-haiku-20241022 Respone Error : ", error);
        }
      } while (inLoop && loopCount < 5);

      // if ai response did not came in json
      if (inLoop) {
        return res
          .status(500)
          .json(
            new ApiResponse(
              500,
              {},
              "Something went wrong while generating MCQs."
            )
          );
      }

      // TODO ADD OWNER
      const createMcq = await Mcq.create({
        topic: aiRes.topic,
        questions: aiRes.questions,
        isPublic: false,
        owner: new mongoose.Types.ObjectId(req.user._id || ""),
      });

      if (!createMcq) {
        return res
          .status(500)
          .json(
            new ApiResponse(
              500,
              {},
              "Something went wrong while saving MCQs in database."
            )
          );
      }

      credit.point -= 1;
      await credit.save();

      await CreditHistory.create({
        owner: new mongoose.Types.ObjectId(req.user._id || ""),
        historyType: "DECREASE",
        pointValue: -1,
        note: `Created new Mcq paper ${aiRes.topic}`,
      });

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { ...createMcq, credit: credit.point },
            "MCQ created successfully."
          )
        );
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json(
          new ApiResponse(500, {}, "Something went wrong while creating MCQs.")
        );
    }
  }

  // TODO: Add PDF handling logic
  // If a PDF is provided, implement PDF parsing logic

  try {
    const credit = await Credit.findOne({
      owner: new mongoose.Types.ObjectId(req.user._id || ""),
    });

    if (!credit || credit.point < 5) {
      deleteLocalFiles([topicPdf.path]);
      return res
        .status(401)
        .json(
          new ApiResponse(
            401,
            {},
            "Don,t Have Credit to Generat Mcq from Documents, minimum 5 Credit needed."
          )
        );
    }

    const pdfBase64 = convertPDFToBase64(topicPdf.path);

    // try genareting mcqs in json format max count = 5
    do {
      loopCount += 1;
      try {
        const pdfAiResponse = await anthropic.beta.messages.create({
          model: "claude-3-5-sonnet-20241022",
          betas: ["pdfs-2024-09-25"],
          max_tokens: 8192,
          system: `You are a teacher make mcqs, dont repeat same questions and return it as json format like {"topic": "Pointers in C","questions": [{"question": "What is a pointer in C?","options": ["A variable that stores the memory address of another variable","A variable that stores only integer values","A function that returns an address","A constant memory location"],"correct_answer": "A variable that stores the memory address of another variable"},{"question": "How do you declare a pointer to an integer in C?","options": ["int ptr","int *ptr","*int ptr","ptr int"],"correct_answer": "int *ptr"
              },{"question": "What does the & operator do?","options": ["Multiplies two numbers","Returns the memory address of a variable","Creates a new pointer","Allocates memory dynamically"],"correct_answer": "Returns the memory address of a variable"}]}`,
          messages: [
            {
              content: [
                {
                  type: "document",
                  source: {
                    media_type: "application/pdf",
                    type: "base64",
                    data: pdfBase64,
                  },
                },
                {
                  type: "text",
                  text: `make mcqs`,
                },
              ],
              role: "user",
            },
          ],
        });

        console.log(pdfAiResponse);

        aiRes = JSON.parse(pdfAiResponse.content[0].text);

        inLoop = false;
      } catch (pdfErr) {
        console.log("claude-3-5-sonnet-20241022 PDF mcq Response : ", pdfErr);
      }
    } while (inLoop && loopCount < 5);

    // delete pdf file from public folder
    deleteLocalFiles([topicPdf.path]);

    // if ai response did not came in json
    if (inLoop) {
      return res
        .status(500)
        .json(
          new ApiResponse(
            500,
            {},
            "Something went wrong while generating MCQs."
          )
        );
    }

    // TODO ADD OWNER
    const createMcq = await Mcq.create({
      topic: aiRes.topic,
      questions: aiRes.questions,
      isPublic: false,
      owner: new mongoose.Types.ObjectId(req.user._id || ""),
    });

    if (!createMcq) {
      return res
        .status(500)
        .json(
          new ApiResponse(
            500,
            {},
            "Something went wrong while saving MCQs from given pdf in database."
          )
        );
    }

    credit.point -= 5;
    await credit.save();

    await CreditHistory.create({
      owner: new mongoose.Types.ObjectId(req.user._id || ""),
      historyType: "DECREASE",
      pointValue: -5,
      note: `Created new Mcq paper ${aiRes.topic}`,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { ...createMcq, credit: credit.point },
          "MCQ created successfully from given pdf."
        )
      );
  } catch (error) {
    console.error(error);
    deleteLocalFiles([topicPdf.path]);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          {},
          "Something went wrong while creating MCQs from given pdf."
        )
      );
  }
});

// get mcq created by current user

const getGenaretedMcqByCurrentuser = asyncHandler(async (req, res) => {
  const page = parseInt(req.body.page) || 1;
  const limit = parseInt(req.body.limit) || 10;

  const uId = req.user._id || null;

  const pipeline = [
    {
      $match: {
        owner: new mongoose.Types.ObjectId(uId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        topic: 1,
        isPublic: 1,
      },
    },
  ];

  // Use aggregatePaginate to paginate the results
  const options = { page, limit };

  const mcqs = await Mcq.aggregatePaginate(Mcq.aggregate(pipeline), options);

  res
    .status(200)
    .json(
      new ApiResponse(200, mcqs, "Current users Mcqs fetched successfully.")
    );
});

const searchGenaretedMcqByCurrentuser = asyncHandler(async (req, res) => {
  const { q } = req.body;

  const uId = req.user._id || null;

  if(!q){
    return res.status(400).json(new ApiResponse(400, [], ""));
  }

  const mcqs = await Mcq.find({
    owner: new mongoose.Types.ObjectId(uId),
    topic: { $regex: q, $options: "i" }, // 'i' for case-insensitive matching
  }).select("-questions");

  return res.status(200).json(new ApiResponse(200, mcqs, ""));
});

// get mcq from mcqId

const getMcq = asyncHandler(async (req, res) => {
  const { mcqId } = req.body;

  if (!mcqId) {
    return res.status(400).json(new ApiResponse(400, {}, "Mcq Id not given."));
  }

  if (!mongoose.isValidObjectId(mcqId)) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Mcq Id not given Properly."));
  }

  try {
    const mcq = await Mcq.findById(mcqId);

    if (!mcq) {
      return res.status(404).json(new ApiResponse(404, {}, "Mcq can,t find."));
    }

    if (mcq.isPublic || String(mcq.owner) === String(req.user._id)) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { mcq: mcq, isOwner: String(mcq.owner) === String(req.user._id) },
            "Mcq paper founded."
          )
        );
    }

    return res
      .status(403)
      .json(new ApiResponse(403, {}, "You can't acces this Mcq Paper."));
  } catch (err) {
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Something went wrong while geting Mcq."));
  }
});

// edit mcq title name

const editMcqTitle = asyncHandler(async (req, res) => {
  const { mcqId, newTitle } = req.body;

  if (!mcqId) {
    return res.status(400).json(new ApiResponse(400, {}, "Mcq Id not given."));
  }

  if (!mongoose.isValidObjectId(mcqId)) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Mcq Id not given Properly."));
  }

  try {
    const mcq = await Mcq.findById(mcqId);

    if (!mcq) {
      return res.status(404).json(new ApiResponse(404, {}, "Mcq can,t find."));
    }

    if (String(mcq.owner) !== String(req.user._id)) {
      return res
        .status(403)
        .json(new ApiResponse(403, {}, "You can't edit this mcq."));
    }

    mcq.topic = newTitle;

    await mcq.save();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Mcq paper's title edited succesfully."));
  } catch (err) {
    return res
      .status(500)
      .json(
        new ApiResponse(500, {}, "Something went wrong while editing title.")
      );
  }
});

// delete mcq

const deleteMcq = asyncHandler(async (req, res) => {
  const { mcqId } = req.body;

  if (!mcqId) {
    return res.status(400).json(new ApiResponse(400, {}, "Mcq Id not given."));
  }

  if (!mongoose.isValidObjectId(mcqId)) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Mcq Id not given Properly."));
  }

  try {
    const mcq = await Mcq.findById(mcqId);

    if (!mcq) {
      return res.status(404).json(new ApiResponse(404, {}, "Mcq can,t find."));
    }

    if (String(mcq.owner) !== String(req.user._id)) {
      return res
        .status(403)
        .json(new ApiResponse(403, {}, "You can't delete this mcq."));
    }

    await Mcq.deleteOne({ _id: mcq._id });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Mcq paper deleted succesfully."));
  } catch (err) {
    return res
      .status(500)
      .json(
        new ApiResponse(500, {}, "Something went wrong while deleteing Mcq.")
      );
  }
});

// Post ANS

const postMcqAns = asyncHandler(async (req, res) => {
  const { mcqId, ans = [] } = req.body;

  if (!mcqId) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "MCQ ID not provided."));
  }

  if (!mongoose.isValidObjectId(mcqId)) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Mcq Id not given Properly."));
  }

  if (ans.length < 1) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Answers not provided."));
  }

  try {
    const mcq = await Mcq.findById(mcqId);

    if (!mcq) {
      return res.status(404).json(new ApiResponse(404, {}, "MCQ not found."));
    }

    if (mcq.isPublic || mcq.owner.toString() === req.user._id.toString()) {
      const { score, answers } = calculateScoreAndAnswers(ans, mcq.questions);

      const newAns = await McqAns.create({
        answers,
        score,
        owner: req.user._id,
        mcqId,
      });

      return res
        .status(200)
        .json(
          new ApiResponse(200, newAns, "MCQ answers recorded successfully.")
        );
    }

    return res
      .status(403)
      .json(
        new ApiResponse(403, {}, "You don't have access to this MCQ Paper.")
      );
  } catch (err) {
    return res
      .status(500)
      .json(
        new ApiResponse(500, {}, "An error occurred while processing the MCQ.")
      );
  }
});

// get mcq's all ANS

const getMcqAnsById = asyncHandler(async (req, res) => {
  const { mcqId } = req.body;

  const page = parseInt(req.body.page) || 1;
  const limit = parseInt(req.body.limit) || 10;

  try {
    if (!mcqId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Mcq Id not given."));
    }

    const mcq = await Mcq.findById(mcqId);

    if (!mcq) {
      return res.status(404).json(new ApiResponse(404, {}, "Mcq can,t find."));
    }

    const pipeline = [
      {
        $match: {
          mcqId: new mongoose.Types.ObjectId(mcq._id),
        },
      },
      {
        $sort: {
          score: -1,
        },
      },
      {
        $lookup: {
          from: "users",
          foreignField: "_id",
          localField: "owner",
          as: "ans_giver",
          pipeline: [
            {
              $project: {
                avatar: 1,
                username: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          answer_giver: { $first: "$ans_giver" },
        },
      },
      {
        $project: {
          answers: 1,
          score: 1,
          owner: 1,
          answer_giver: 1,
          createdAt: 1,
        },
      },
    ];

    const options = { page, limit };

    const answers = await McqAns.aggregatePaginate(
      McqAns.aggregate(pipeline),
      options
    );

    return res
      .status(200)
      .json(new ApiResponse(200, answers, "Answers given."));
  } catch (err) {
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Something went wrong while geting Mcq."));
  }
});

////////////////////////////////////////////////////////////////////

// for SAQ

const generateSAQ = asyncHandler(async (req, res) => {
  const { topic } = req.body;

  if (String(topic).trim().length < 1) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "All Filds are Require."));
  }

  // give response

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "MCQ created succesfully."));
});

export {
  generateMCQ,
  generateSAQ,
  getGenaretedMcqByCurrentuser,
  searchGenaretedMcqByCurrentuser,
  getMcq,
  editMcqTitle,
  deleteMcq,
  postMcqAns,
  getMcqAnsById,
};
