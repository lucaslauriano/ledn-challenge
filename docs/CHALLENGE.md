Technical Challenge
At Ledn, we believe great engineering is about building systems that are reliable, observable, and resilient—especially under the pressure and complexity of financial operations at scale.

The Challenge
We are giving you 3–5 days to build something that blows us away. This is a deadline, not an expectation of effort—we respect your time and don't expect you to spend all 3–5 days on this. Focus on quality over quantity.

Your challenge is to build a full-stack prototype that tackles one of the friction points below. We want to see how you think about architecture, data flow, and system design when given an open-ended problem.

We have outlined a few common financial operations friction points for you. You may choose ONE of the following hypothetical scenarios to solve, or invent your own workflow that strictly aligns with our philosophy.

You are also welcome to combine multiple frictions into a single solution. Some frictions naturally compose well together (e.g. a fragile data feed that creates a settlement timing trap under pressure), and ambitious candidates should feel encouraged to tackle more than one as a unified system rather than isolated prototypes.

See FRICTIONS.md for a complete list.

Technical Requirements
As a Senior Fullstack Engineer, you have full control over the tech stack you choose to solve this problem.

For context, our internal stack includes: Node, TypeScript/JavaScript, Python, React, Chakra UI, NestJS, MongoDB, Redis, NATS Core/JetStream, AWS (S3, SNS, SQS, Lambda, DynamoDB, etc.), Terraform, OpenTelemetry, Sentry, and GitHub Actions.

While you are free to use whatever tools you feel best solve the challenge, demonstrating proficiency with our core ecosystem is a great way to stand out.

Regardless of the stack, we expect to see:

Fullstack Implementation:
A backend system (e.g. API, database/mock-data layer, event bus, or workflow engine).
A frontend interface (e.g. Web UI, operational dashboard, or CLI tool) that makes the system's behavior visible and actionable.
Systems Thinking in Practice:
Show us how your system handles failure, state, and data consistency. Demonstrate that you've thought through the edge cases, not just the happy path.
The "Data Producer" Mindset:
Show us how your system structures and exposes data. Demonstrate how your architecture ensures the data is reliable, consistent, and accessible to the parts of the system that need it.
Production-Ready Quality:
Show us your standard for shipping to production. We intentionally aren't providing a checklist because we want to see your judgment on how to balance speed, reliability, and code quality.
Deliverables
Source Code: Please create a private GitHub repository for your project. Keeping the repository private helps us ensure the integrity of this challenge for future candidates. When you are ready to submit, invite the GitHub user @ledn-reviewer as a collaborator. (Please do not send zip files or open public repositories).
README.md: Include clear instructions in your repository on how to run your application locally (make sure it runs). Please also include a brief explanation of your architecture and technical decisions. Don't forget to include the friction(s) you are solving for and how your solution brilliantly solves the problem.
Loom Video: A 3-5 minute video demonstrating your solution, explaining the problem you chose, your architectural decisions, and how you addressed the friction(s).
Evaluation Criteria
We will evaluate your submission based on:

Systems Thinking: How well did you model the problem domain? Did you choose the right architecture and form factor for the friction described?
Resilience & Observability: Does your system behave predictably under failure? Can an operator understand what the system is doing—and why?
AI Pragmatism: Did you use AI effectively to solve the problem, or is it just a gimmick? Did you handle edge cases?
Conceptual Understanding & Trade-offs: How well do you understand the concepts and tools you are using? Are you actively aware of the architectural trade-offs, or are you just "asleep at the wheel" relying on defaults?
Execution & Completeness: Does the prototype work end-to-end?
Code Quality: Is the codebase structured like a senior engineer wrote it?
Good luck. We can't wait to see what you build! Let us know if you have any clarifying questions.
