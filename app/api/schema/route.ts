import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL_ID = "gemini-2.0-flash";

const META_PROMPT = `
You are a JSON Schema expert. Your task is to create JSON schema based on the user input. The schema will be used for extra data.  

You must also make sure:
- All fields in an object are set as required
- All objects must have properties defined
- Order matters! If the values are dependent or would require additional information, make sure to include the additional information in the description. Same counts for "reasoning" or "thinking" should come before the conclusion.
- $defs must be defined under the schema param
- Return only the schema JSON not more, use \`\`\`json to start and \`\`\` to end the JSON schema

Restrictions:
- You cannot use examples, if you think examples are helpful include them in the description.
- You cannot use default values, If you think default are helpful include them in the description.
- Top level cannot have a "title" property only "description"
- You cannot use $defs, directly in the schema, don't use any $defs and $ref in the schema. Directly define the schema in the properties.
- Never include a $schema
- The "type" needs to be a single value, no arrays

Guidelines:
- If the user prompt is short define a single object schema and fields based on your knowledge.
- If the user prompt is in detail about the data only use the data in the schema. Don't add more fields than the user asked for.

Examples:

Input: Cookie Recipes
Output: \`\`\`json
{
    "description": "Schema for a cookie recipe, including ingredients and quantities. The 'ingredients' array lists each ingredient along with its corresponding quantity and unit of measurement. The 'instructions' array provides a step-by-step guide to preparing the cookies. The order of instructions is important.",
    "type": "object",
    "properties": {
       "name": {
          "type": "string",
          "description": "The name of the cookie recipe."
       },
       "description": {
          "type": "string",
          "description": "A short description of the cookie, including taste and textures."
       },
       "ingredients": {
          "type": "array",
          "description": "A list of ingredients required for the recipe.",
          "items": {
             "type": "object",
             "description": "An ingredient with its quantity and unit.",
             "properties": {
                "name": {
                   "type": "string",
                   "description": "The name of the ingredient (e.g., flour, sugar, butter)."
                },
                "quantity": {
                   "type": "number",
                   "description": "The amount of the ingredient needed."
                },
                "unit": {
                   "type": "string",
                   "description": "The unit of measurement for the ingredient (e.g., cups, grams, teaspoons). Use abbreviations like 'tsp' for teaspoon and 'tbsp' for tablespoon."
                }
             },
             "required": [
                "name",
                "quantity",
                "unit"
             ]
          }
       },
       "instructions": {
          "type": "array",
          "description": "A sequence of steps to prepare the cookie recipe. The order of instructions matters.",
          "items": {
             "type": "string",
             "description": "A single instruction step."
          }
       }
    },
    "required": [
       "name",
       "description",
       "ingredients",
       "instructions"
    ]
}
\`\`\`

Input: Book with title, author, and publication year.
Output: \`\`\`json
{
    "type": "object",
    "properties": {
        "title": {
            "type": "string",
            "description": "The title of the book."
        },
        "author": {
            "type": "string",
            "description": "The author of the book."
        },
        "publicationYear": {
            "type": "integer",
            "description": "The year the book was published."
        }
    },
    "required": [
        "title",
        "author",
        "publicationYear"
    ],
}
\`\`\`

Input: {USER_PROMPT}`.trim();

export async function POST(request: Request) {
  try {
    // Get the prompt from the request body
    const { prompt } = await request.json();
    // Get the model
    const model = genAI.getGenerativeModel({ model: MODEL_ID });
    // Generate the content
    const result = await model.generateContent(
      META_PROMPT.replace("{USER_PROMPT}", prompt)
    );
    // Get the response
    const response = await result.response;
    // Remove markdown code block markers if present
    const jsonString = response
      .text()
      .replace(/^```json\n?/, "")
      .replace(/\n?```$/, "");
    // Return the schema
    return NextResponse.json({ schema: JSON.parse(jsonString) });
  } catch (error) {
    console.error("Error generating schema:", error);
    return NextResponse.json(
      { error: "Failed to generate schema" },
      { status: 500 }
    );
  }
}
