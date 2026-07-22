# Sophia — an AI philosophy learning app

Add any philosophical concept — like **Stoicism**, **Kant's categorical
imperative**, or **the meaning of life** — and the app generates a **lesson**,
the **key ideas**, and **practical points** you can apply.

Built with **React Native + Expo** (one codebase runs on both iOS and Android).

> **Status:** The full app works today using built-in placeholder content, so
> you can build, run, and feel the whole experience without any API keys.
> Turning on real AI is a small, isolated change — see
> [Adding real AI](#adding-real-ai) below.

---

## Run it on your phone (easiest way)

You do **not** need Xcode or Android Studio for this.

1. **Install Node.js** (v18 or newer) on your computer if you haven't:
   https://nodejs.org
2. **Install the "Expo Go" app** on your phone from the App Store / Play Store.
3. In this project folder, install dependencies:
   ```bash
   npm install
   ```
4. Start the app:
   ```bash
   npx expo start
   ```
5. A **QR code** appears in your terminal. Scan it with:
   - **iPhone:** the Camera app
   - **Android:** the Expo Go app

The app opens on your phone and reloads automatically whenever you edit a file.

> Prefer an on-screen simulator? Press `i` (iOS, macOS only) or `a` (Android,
> requires Android Studio) in the terminal after `npx expo start`.

---

## How the project is organized

```
App.tsx                     App entry point: navigation + global state provider
index.ts                    Registers App.tsx with Expo (don't need to touch)
app.json                    App name, icon, and configuration

src/
  ai.ts                     ⭐ The ONE place content is generated (swap in real AI here)
  ConceptsContext.tsx       Global state: the list of concepts + add/remove/regenerate
  storage.ts                Saves concepts on the device (AsyncStorage)
  types.ts                  Data shapes (Concept, GeneratedContent)
  theme.ts                  Colors, spacing, font sizes — restyle the app here
  navigation.ts             The list of screens and what data each needs

screens/
  HomeScreen.tsx            Your library of concepts + the Add button
  AddConceptScreen.tsx      Type a concept (or tap a suggestion) to add it
  ConceptDetailScreen.tsx   Shows the Lesson / Key Ideas / Practical Points
```

### The core loop

```
Add screen  →  addConcept(title)        (ConceptsContext)
            →  saved to the device       (storage.ts)
            →  generateConcept(title)     (ai.ts)  ← content is created here
            →  result saved & shown       (ConceptDetailScreen)
```

Everything flows through `generateConcept()` in `src/ai.ts`. The rest of the app
doesn't know or care whether that content comes from a placeholder or from a
real AI — which is exactly why turning on AI later is a one-file change.

---

## Adding real AI

Right now `src/ai.ts` returns hand-written content. To use **real Claude AI**:

**Important:** never put an API key inside the mobile app — anyone can extract
it from a published app. Instead, run a tiny backend that holds the key, and
have the app call your backend.

### 1. A minimal backend (Node.js example)

```js
// server.js  — run this on a server you control (not in the app)
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(express.json());
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/generate', async (req, res) => {
  const { title } = req.body;
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content:
        `You are a philosophy tutor. For the concept "${title}", respond with ` +
        `ONLY valid JSON: {"summary": "one sentence", "lesson": "2-3 short ` +
        `paragraphs", "keyIdeas": ["...","...","...","..."], ` +
        `"practicalPoints": ["...","...","...","..."]}`,
    }],
  });
  res.json(JSON.parse(msg.content[0].text));
});

app.listen(3000);
```

### 2. Point the app at it

In `src/ai.ts`, replace the body of `generateConcept` with the `fetch` version
shown in the comment at the bottom of that file, using your backend's URL.
**Nothing else in the app changes.**

---

## Ideas for what to build next

- **Quiz / flashcard mode** generated from a concept's key ideas
- **Categories or tags** (ethics, metaphysics, eastern philosophy…)
- **Search** across your saved concepts
- **Daily concept** notification
- **Cloud sync / accounts** (start by swapping out `storage.ts`)
- **Follow-up questions** — ask the AI to go deeper on a specific point
