# RAG Upgrade

**The model is the brain. RAG is what it reads before answering. The app code is the assistant’s work process.**

Right now, the model may be smart, but the work process is bad. It is like hiring a smart business advisor and then saying:

“Before you answer, randomly check three filing cabinets, skim a few meeting notes, maybe look at emails, maybe don’t, then write a formatted report.”

That will feel robotic even if the underlying model is good.

What we actually want is closer to:

“Listen to what Megan is really asking, figure out what kind of help she needs, pull the right facts, understand what changed, form an opinion, and talk back like a strategic partner.”

So the first brainstorming question is not technical. It is:

### 1. What job is the assistant supposed to be doing in that moment?

I think there are five very different modes:

1. **Project advisor**
   “What’s going on with Vermillion Rise?”
   It should brief you like a senior PM who knows the job.

2. **Business strategist**
   “What should I be worried about this week?”
   It should look across projects, money, risk, people, pipeline, and operations.

3. **Thought partner**
   “Help me think through whether we should bid this.”
   It should brainstorm tradeoffs, ask sharp questions, and give an opinion.

4. **Company memory**
   “What did Brandon say about billing?”
   It should search meetings, Teams, email, and answer from actual history.

5. **App helper**
   “How do I create a commitment?”
   It should answer from app help/workflow docs, not act like a strategist.

The current assistant seems to blur all five together. That is probably why it feels like it is “running random tools.” It does not have a clean sense of what kind of conversation it is in.

### 2. RAG should not mean “search everything.” It should mean “prepare the assistant properly.”

For example, if you ask, “What’s the latest on this project?” the assistant should prepare a packet like:

- Project facts: budget, contract, change orders, RFIs, submittals, schedule
- Recent movement: meetings, Teams, email, documents
- Risk signals: delays, cost exposure, unhappy client/vendor, missing approvals
- Memory: what we already discussed before
- Gaps: what it could not confirm

Then the model should answer from that packet.

### 3. The assistant needs to form a point of view.

A bad answer says:

“Here are some recent updates from the project.”

A useful answer says:

“The project is not in crisis, but procurement is becoming the pressure point. The money still looks manageable, but the Teams/email traffic suggests the schedule risk is moving faster than the formal project record shows. I’d focus on getting owner decisions locked this week before this turns into a change-order fight.”

That difference is not just tone. It comes from the system being designed to synthesize, not summarize.

**Done:** We have the strategy doc written, and the core idea is clear: the assistant needs an advisor loop, not just better search.

**What Remains:** We need to decide what the assistant should feel like in each mode before coding it. Otherwise we’ll keep patching symptoms.

**Recommended Next Step:** Let’s start with one mode and define the ideal behavior. I’d start with this question:

When you ask, **“What’s the latest on this project?”**, what would a truly valuable answer include every single time?