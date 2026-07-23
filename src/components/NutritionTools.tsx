"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CalculateIcon from "@mui/icons-material/Calculate";
import SendIcon from "@mui/icons-material/Send";

interface CostedIngredient {
  name: string;
  grams: number;
  matched: boolean;
  kcal: number;
  proteinG: number;
}
interface DishResult {
  dish: string;
  ingredients: CostedIngredient[];
  totals: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  coverage: number;
  aiRecognized: boolean;
}

export interface AskContext {
  goal?: string;
  dailyCalories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  todayDay?: string;
  todayMeals?: { name: string; calories: number; proteinG: number }[];
  language?: string;
}

/** Downscale a chosen photo in the browser so the upload stays small and fast. */
async function fileToImageInput(file: File): Promise<{ mimeType: string; dataBase64: string }> {
  const bitmap = await createImageBitmap(file);
  const max = 1024;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  return { mimeType: "image/jpeg", dataBase64: dataUrl.split(",")[1] };
}

export default function NutritionTools({ context }: { context: AskContext }) {
  return (
    <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
      <DishChecker />
      <Assistant context={context} />
    </Box>
  );
}

function DishChecker() {
  const [text, setText] = React.useState("");
  const [preview, setPreview] = React.useState<string | null>(null);
  const [image, setImage] = React.useState<{ mimeType: string; dataBase64: string } | null>(null);
  const [result, setResult] = React.useState<DishResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setImage(await fileToImageInput(file));
  };

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze-dish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() || undefined, image: image ?? undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
      setResult(body as DishResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
        Check a dish you made
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Photograph it or type the ingredients. We recognise what&apos;s in it and compute the
        nutrition from USDA data.
      </Typography>

      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2, flexWrap: "wrap" }}>
        <Button component="label" variant="outlined" size="small" startIcon={<PhotoCameraIcon />}>
          Photo
          <input hidden type="file" accept="image/*" capture="environment" onChange={onFile} />
        </Button>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="dish" style={{ height: 40, borderRadius: 6 }} />
        )}
      </Box>

      <TextField
        fullWidth
        multiline
        minRows={2}
        size="small"
        label="…or type it"
        placeholder="e.g. 200g chicken breast, 100g rice, 1 tbsp olive oil"
        value={text}
        onChange={(e) => setText(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Button
        variant="contained"
        onClick={analyze}
        disabled={loading || (!text.trim() && !image)}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CalculateIcon />}
      >
        Calculate
      </Button>

      {error && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {result.dish}
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5, my: 1, flexWrap: "wrap" }}>
            <Chip color="primary" label={`${result.totals.kcal} kcal`} />
            <Chip variant="outlined" label={`${result.totals.proteinG} g protein`} />
            <Chip variant="outlined" label={`${result.totals.carbsG} g carbs`} />
            <Chip variant="outlined" label={`${result.totals.fatG} g fat`} />
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {result.ingredients.map((ing, i) => (
              <Typography
                key={i}
                component="li"
                variant="body2"
                color={ing.matched ? "text.primary" : "text.disabled"}
              >
                {Math.round(ing.grams)} g {ing.name}
                {ing.matched ? ` — ${ing.kcal} kcal, ${ing.proteinG} g protein` : " — not in USDA, not counted"}
              </Typography>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Amounts are {result.aiRecognized ? "AI estimates" : "your inputs"}; calories and protein
            are computed from USDA measurements ({Math.round(result.coverage * 100)}% of ingredients
            matched).
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

function Assistant({ context }: { context: AskContext }) {
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), context }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `Error ${res.status}`);
      setAnswer(body.answer as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
        Ask about your diet
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Questions about your plan, targets or meals — answered from your actual plan.
      </Typography>

      <TextField
        fullWidth
        multiline
        minRows={2}
        size="small"
        placeholder="e.g. Can I swap dinner for something lighter? Am I getting enough protein?"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask();
        }}
        sx={{ mb: 2 }}
      />

      <Button
        variant="contained"
        onClick={ask}
        disabled={loading || !question.trim()}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
      >
        Ask
      </Button>

      {error && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {answer && (
        <Alert severity="info" variant="outlined" sx={{ mt: 2, whiteSpace: "pre-wrap" }}>
          {answer}
        </Alert>
      )}
    </Paper>
  );
}
