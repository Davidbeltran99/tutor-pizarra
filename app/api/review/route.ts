import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const exercise = body.exercise as string;
    const expectedAnswer = body.expectedAnswer as string;
    const finalAnswer = body.finalAnswer as string;
    const image = body.image as string;

    const response = await client.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Eres un tutor de matemáticas para niños.

Analiza la respuesta del estudiante usando estos datos:

Ejercicio: ${exercise}
Respuesta correcta esperada: ${expectedAnswer}
Respuesta final escrita por el estudiante: ${finalAnswer}

También recibes una imagen de la pizarra que sirve como contexto visual para ver si el niño intentó hacer cuentas o procedimientos.

Instrucciones:
- Usa como respuesta principal del estudiante el valor escrito en "Respuesta final escrita por el estudiante".
- Usa la imagen solo como apoyo contextual.
- Compara la respuesta final del estudiante con la respuesta correcta esperada.
- Si está mal, corrige con tono amable y breve.
- Da una pista sencilla para un niño.
- Responde SOLO en JSON con este formato:

{
  "is_correct": true,
  "feedback": "",
  "hint": "",
  "student_answer": ""
}`,
            },
            {
              type: "input_image",
              image_url: image,
              detail: "auto",
            },
          ],
        },
      ],
    });

    return Response.json({
      ok: true,
      result: response.output_text,
    });
  } catch (error: any) {
    console.error("ERROR OPENAI:", error);

    return Response.json(
      {
        ok: false,
        message: error?.message || "Error con OpenAI",
      },
      { status: 500 }
    );
  }
}