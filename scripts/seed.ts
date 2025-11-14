import { config } from "dotenv";

// Load environment variables FIRST before any other imports
config({ path: ".env" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createHash } from "crypto";
import * as schema from "../src/db/schema";
import { textData, metadata, user } from "../src/db/schema";
import { sql, eq } from "drizzle-orm";
import pgvector from "pgvector";
import { generateBatchEmbeddings } from "../src/utils/embeddings";
import { randomUUID } from "crypto";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

const db = drizzle(pool, { schema });

// Sample users to create
const sampleUsers = [
  { name: "Maya Chen", email: "maya@example.com", username: "maya_chen" },
  { name: "Jordan Rivers", email: "jordan@example.com", username: "jordan_r" },
  { name: "Kai Thompson", email: "kai@example.com", username: "kai_t" },
  { name: "Luna Park", email: "luna@example.com", username: "luna_park" },
  { name: "River Stone", email: "river@example.com", username: "river_s" },
  { name: "Sage Williams", email: "sage@example.com", username: "sage_w" },
  { name: "Phoenix Lee", email: "phoenix@example.com", username: "phoenix_lee" },
];

// Sample texts - diverse content with varying lengths
const sampleTexts = [
  // Short observations
  "The weight of silence can speak louder than a thousand conversations.",
  "Rain tastes different when you're not running from it.",
  "Code is poetry written in logic, bugs are the verses we got wrong.",
  "The blank page isn't your enemy; it's an invitation to play.",
  "Mountains don't move, but our perception of them changes with every step.",

  // Medium thoughts
  `Every ending is just a beginning wearing a different mask. We build walls in our minds long before we notice the cages. Time doesn't heal wounds; it teaches us how to carry them differently.

The stories we tell ourselves become the architecture of our reality. Comfort zones are beautiful places, but nothing ever grows there.`,

  `The algorithm knows what you want before you do, and that should terrify you. We've connected the entire world but somehow feel more alone than ever.

Digital permanence is the new forgetting—everything saved, nothing remembered. The internet promised connection but delivered infinite distraction.`,

  // Longer essays and reflections
  `On the nature of creativity: The muse doesn't visit the idle; she's drawn to the working. Great work emerges from the courage to make mediocre work first. Your unique perspective is your competitive advantage.

Constraints breed creativity; infinite options breed paralysis. The gap between your taste and your ability closes with practice, one imperfect iteration at a time. Shipping imperfect work is better than perfecting unreleased work that never sees the light of day.

Creativity is connecting things that others haven't connected yet. It's about showing up consistently, trusting the process, and being willing to fail publicly. The creative process is 90% showing up, 10% inspiration.`,

  `A meditation on time and memory: Yesterday is a memory, tomorrow is a fantasy, today is a gift. Time moves forward but memory moves in all directions at once. The past exists only in our minds; the future, in our imaginations.

Every moment dies the instant it's born, yet somehow we string them together into narratives that give our lives meaning. Nostalgia is time travel for the emotionally adventurous, a way to revisit who we were without the burden of being them again.

The present is a razor's edge between two eternities. We spend our lives collecting moments we can never relive, photographs of experiences that lose their texture in translation. Memory is less like a recording and more like a reconstruction, each recall subtly altering what came before.`,

  // Technical documentation style
  `A practical guide to managing technical debt:

Technical debt isn't inherently bad—it's a tool, like financial debt. The key is knowing when to incur it and having a plan to pay it down. Ship the MVP, but document what corners you cut. Future you will thank present you.

Set aside 20% of each sprint for refactoring. Treat it as essential maintenance, not optional nice-to-have work. Code that's hard to change becomes code that never changes, and that's how systems die.

The best time to refactor was when you wrote the code. The second best time is now. Every day you delay increases the interest on your technical debt.`,

  // Stream of consciousness
  `Coffee shops are theaters where everyone performs the act of productivity. I watch a student highlight every line in their textbook—yellow marker making it all important, therefore nothing important. The espresso machine hisses like it's angry at the beans.

Outside, rain starts. Not the dramatic kind, but the persistent grey mist that soaks you slowly. Someone forgot their umbrella. Someone always forgets their umbrella. The barista knows everyone's order but nobody's name.

We're all strangers sharing the same air, the same wifi password, the same desperate hope that the next word we type will be the right one.`,

  // Lists and observations
  `Things I've learned from debugging production issues at 3am:

1. The bug is never where you think it is
2. The error message is lying to you (or you're misunderstanding it)
3. Rubber duck debugging works because explaining forces clarity
4. The fix is usually embarrassingly simple
5. You will make this exact mistake again in six months
6. Past you left no comments because past you was an optimist
7. The backup you need is the one you didn't make
8. "It works on my machine" is the beginning of a horror story
9. The user is right, even when they're wrong
10. Sleep deprivation and code review don't mix`,

  // Philosophical musings
  `Authenticity is exhausting in a world that rewards performance. Everyone you meet is fighting a battle you know nothing about. We judge ourselves by our intentions and others by their actions, creating an asymmetry of compassion that isolates us all.

The loudest person in the room is often the most afraid. Vulnerability is the birthplace of connection and courage. We're more afraid of being seen than being invisible, yet we perform constantly, curating our lives for an audience of strangers.

Comparison is the thief of joy and the murderer of contentment. Most regrets are about roads not taken, not mistakes made. People remember how you made them feel, not what you said.`,

  // Technical explanation
  `Why embeddings matter for semantic search:

Traditional search relies on keyword matching—if you search for "automobile" it won't find "car" unless someone thought to add it as a synonym. Embeddings change this by representing meaning as vectors in high-dimensional space.

Similar concepts cluster together in this space. "car", "automobile", "vehicle" end up as nearby points because they appear in similar contexts. This lets us find semantically related content even when the exact words don't match.

The magic happens through transformer models trained on massive text corpora. They learn that "king" - "man" + "woman" ≈ "queen" by seeing these words used in relationship patterns. It's statistics all the way down, but statistics that approximate understanding.`,

  // Personal narrative
  `I deleted my social media accounts last year and here's what happened: nothing dramatic. The world kept spinning. My friends still called. I missed exactly three things—event invitations, the sharing of niche memes, and the illusion of keeping up with people I'd never actually talk to.

What I gained: hours of time back, less anxiety about world events I can't control, freedom from the performance of seeming interesting. I read more books. I forgot what most people look like now, which is both sad and liberating.

The FOMO faded after a month. Turns out you don't miss what you're not constantly reminded you're missing. My thoughts became mine again, unfiltered through the lens of how they'd play to an audience. I can be boring now. It's a relief.`,

  // Product thinking
  `The best products solve problems users didn't know they had. Before the iPhone, nobody was complaining about their phone's web browser. Before Spotify, nobody said "I wish I could rent access to all music instead of owning it."

Great product design is mostly about saying no. Every feature is a promise to maintain forever. Every button is something users have to understand. Complexity is the default state; simplicity requires ruthless prioritization.

User research tells you what people do, not what they say they do. Watch them struggle with your interface. Every moment of confusion is a design failure. Every workaround users invent is a feature request written in behavior.`,

  // Short poetry-like fragments
  `We orbit around each other, hoping our trajectories align.
The ocean doesn't try to be the ocean; it just is.
Your digital footprint is permanent ink on the fabric of time.
The universe is under no obligation to make sense to you.`,

  // Recipe format (unexpected content type)
  `How to recover from burnout:

Ingredients:
- 3 weeks of saying no to everything non-essential
- 1 permission slip to be unproductive (self-signed)
- Daily doses of sunlight and movement
- Regular servings of activities that have nothing to do with work
- A support network willing to check on you
- Boundaries (freshly established, enforced vigorously)

Instructions:
Stop. Actually stop. Not "work from home" stop, not "just emails" stop. Full stop.

Sleep until your body decides you're done sleeping. Your circadian rhythm will repair itself given the chance. The world won't end if you're unreachable for 48 hours.

Do something with your hands that isn't typing. Garden, cook, paint, build something. Create proof that you exist beyond your productivity.

Note: Recovery takes longer than you think. If you're burned out, you've been running on fumes for months. Two weeks won't fix it. Be patient with yourself.`,

  // Dialogue/conversation
  `"What do you do?"

"I write software."

"Like apps?"

"Sometimes. Mostly I translate business problems into logic that computers can execute."

"So you're a programmer."

"Kind of. I'm more of a professional problem solver who happens to speak Python and JavaScript fluently."

"Is it hard?"

"The code? No. The code is the easy part. The hard part is figuring out what problem we're actually trying to solve. People are terrible at articulating what they need."

"Sounds frustrating."

"It is. But when it works—when the code does exactly what someone needs and they didn't even know they needed it—that's pure magic."`,

  // Meeting notes style
  `Product sync 2024-03-15 - Key takeaways:

- User retention dropped 15% after the redesign. The new UI is objectively better but people hate change more than they hate bad design
- The onboarding flow is losing 60% of users at step 3. Nobody reads instructions. We need to make it so obvious that instructions aren't necessary
- A/B test results: the red button performed 12% better than blue, but we're still shipping blue because the designer will quit if we don't
- Analytics show users are spending 30 mins daily in a feature we were planning to deprecate. Turns out they're using it for something completely different than intended
- New feature deadline moved back 2 weeks. This is the third time. At this point it's not a deadline, it's a suggestion
- Someone asked if we've considered blockchain. Nobody made eye contact. We moved on

Action items: Fix step 3, ship blue button, keep the "deprecated" feature, ignore blockchain person.`,

  // Scientific observation style
  `Observations on the development lifecycle of software projects:

Phase 1 (Weeks 0-2): Unbridled optimism. Everything is possible. The architecture is elegant. The code is clean. We'll definitely write tests this time.

Phase 2 (Weeks 3-8): Reality sets in. Edge cases emerge. Requirements change. The database schema was wrong. We're refactoring core components while promising stakeholders nothing has changed.

Phase 3 (Weeks 9-12): Controlled chaos. Technical debt accumulates. "TODO: fix this later" comments multiply. Coffee consumption increases logarithmically. Someone suggests we should have used a different framework.

Phase 4 (Launch): Everything breaks in production. The bug that only happens on Tuesdays appears. Users do things we never imagined. The staging environment was not, in fact, identical to production.

Phase 5 (Post-launch): Maintenance mode. Hot fixes. Feature requests. The realization that launching is just the beginning. Planning for version 2.0 begins, powered by lessons learned and renewed optimism.

The cycle repeats.`,

  // Cultural commentary
  `We live in an age where everyone is a content creator and nobody is creating anything meaningful. Every meal is a photo op, every thought a potential tweet, every experience pre-analyzed for its shareability.

The performative nature of modern life has turned us all into brands. We curate personas, optimize engagement, A/B test our personalities. Authenticity became a marketing strategy, which is the most inauthentic thing imaginable.

Meanwhile, the algorithms that run our digital lives optimize for engagement, not wellbeing. They've learned that outrage keeps us scrolling, so they feed us outrage. We're angry about things that don't affect us, unaware of things that do.

The solution isn't to abandon technology—it's to be intentional about how we use it. Every app is fighting for your attention. Make them earn it.`,

  // Final short pieces
  `Discomfort is the price of admission to a meaningful life.`,

  `Growth happens in the gaps between who you were and who you're becoming.`,

  `The present is a gift we keep forgetting to open.`,

  `Every relationship is two people continuously negotiating reality.`,

  `We're all unreliable narrators of our own stories.`,

  `The opposite of love isn't hate; it's indifference.`,

  `Purpose isn't found; it's constructed from the materials of daily life.`,
];

// Sample notes for variety
const notes = [
  "From a late night coding session",
  "Overheard at a coffee shop",
  "Personal journal entry",
  "Shower thought that stuck with me",
  "Conversation with a friend",
  "Reflection after a difficult bug fix",
  "Notes from a book I can't remember the title of",
  "3am realization",
  "Product management lessons learned the hard way",
  "Written during a particularly long meeting",
  "Saved from a Twitter thread I never posted",
  "Philosophy while walking to work",
  "Debugging wisdom",
  "Something I wish someone had told me earlier",
  null, // some without notes
  null,
  null,
];

function generateContentHash(text: string): string {
  const normalized = text.trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}

async function seed() {
  console.log("Starting database seed...");

  try {
    // Create sample users first
    console.log("Creating sample users...\n");
    const createdUsers: string[] = [];

    for (const userData of sampleUsers) {
      // Try to insert the user
      const userId = randomUUID();
      const inserted = await db.insert(user).values({
        id: userId,
        name: userData.name,
        email: userData.email,
        username: userData.username,
        emailVerified: true,
      }).onConflictDoNothing().returning({ id: user.id });

      // If user was inserted, use that ID; otherwise fetch existing user
      if (inserted.length > 0) {
        createdUsers.push(inserted[0].id);
        console.log(`Created user: ${userData.username}`);
      } else {
        // User already exists, fetch their ID
        const existing = await db.select({ id: user.id })
          .from(user)
          .where(eq(user.email, userData.email))
          .limit(1);

        if (existing.length > 0) {
          createdUsers.push(existing[0].id);
          console.log(`Using existing user: ${userData.username}`);
        }
      }
    }

    console.log(`\n✓ Prepared ${createdUsers.length} users!\n`);

    // Generate embeddings in batches to optimize API calls
    console.log(`Generating embeddings for ${sampleTexts.length} texts...`);
    console.log("This may take a minute or two...\n");

    const batchSize = 20; // Process in batches to avoid rate limits
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < sampleTexts.length; i += batchSize) {
      const batch = sampleTexts.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sampleTexts.length / batchSize)}...`);

      const embeddings = await generateBatchEmbeddings(batch);
      allEmbeddings.push(...embeddings);

      // Small delay to be nice to the API
      if (i + batchSize < sampleTexts.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`\n✓ Generated ${allEmbeddings.length} embeddings!\n`);

    let insertedCount = 0;

    for (let i = 0; i < sampleTexts.length; i++) {
      const text = sampleTexts[i].trim();
      const hash = generateContentHash(text);
      const embedding = allEmbeddings[i];
      const vectorString = pgvector.toSql(embedding);

      // Insert text data
      await db
        .insert(textData)
        .values({
          hash,
          text,
          embedding: sql`${vectorString}::vector`,
        })
        .onConflictDoNothing();

      // Insert 1-2 metadata entries for each text to create variety
      const metadataCount = Math.floor(Math.random() * 2) + 1;

      for (let j = 0; j < metadataCount; j++) {
        const randomNotes = notes[Math.floor(Math.random() * notes.length)];

        // Randomly assign to a real user
        const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];

        await db.insert(metadata).values({
          textHash: hash,
          createdBy: randomUser,
          notes: randomNotes,
        });

        insertedCount++;
      }

      console.log(
        `Inserted: "${text.substring(0, 60)}${text.length > 60 ? "..." : ""}"`,
      );
    }

    console.log(
      `\n✓ Seed complete! Inserted ${sampleTexts.length} texts with ${insertedCount} metadata entries.`,
    );
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
