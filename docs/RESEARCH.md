# Research Context & Honest Scope

This doc exists so the team (and anyone reading the repo later) has a
straight answer ready for "does anyone actually need this," instead of
overclaiming real-world impact for a 3-4hr build.

## What's real

- **The underlying question is a genuine, actively-worked industry
  problem.** Swiggy piloted drone delivery for Instamart's middle-mile
  (warehouse-to-dark-store) logistics with multiple operators (Garuda
  Aerospace, Skye Air Mobility, TechEagle, Marut Dronetech). Zomato
  separately tested last-mile delivery via its TechEagle acquisition,
  running a real public test flight in 2019 (5kg payload, 5km, 10 minutes,
  80 km/h peak speed) — this is the flight our physics model is calibrated
  against.
- **Regulation is expanding, not static.** DGCA has approved initial
  BVLOS (Beyond Visual Line of Sight) commercial drone corridors in select
  states — reported corridors include Telangana, Uttarakhand, Gujarat,
  Ladakh, and Andhra Pradesh, for uses spanning delivery, logistics, mineral
  survey, and coastal monitoring. Madhya Pradesh (Bhopal) does not currently
  have a published corridor.
- **No public, reusable, city-agnostic feasibility tool exists.** Each
  company that has explored this has done the analysis privately, for
  their own network. A physics-grounded, open methodology applied as a
  case study to a specific tier-2 city is a genuine (if narrow) research
  contribution.

## What's NOT real — say this plainly if asked

- **This tool does not solve the actual bottleneck.** Per the research,
  the real obstacle to drone delivery in India is regulatory approval
  (DGCA BVLOS clearance, Drone Operator Permits, mandatory insurance) and
  hardware/certification cost — not "we don't know if the math works out."
  A better simulation does not move this bottleneck at all.
- **No city, company, or regulator is waiting for this simulation.** It
  will not be adopted or deployed. Framing it as "solving drone delivery
  for Bhopal" will not survive a technically sharp judge's first question.
- **There is genuine industry disagreement this tool cannot resolve.**
  Some industry observers argue drones suit high-labor-cost economies
  (like the US) and that India's comparatively low labor cost may not
  justify switching; drone-industry executives disagree and project large
  future fleet deployments. This project produces *a* number under *its*
  assumptions — it is one data point in an open debate, not a verdict.

## The honest framing (use this in the pitch)

> "This is not a drone delivery product. It's a physics-grounded,
> reproducible research methodology for evaluating drone-vs-ground
> feasibility, calibrated against real trial data, applied to Bhopal as a
> case study. It's the kind of internal analysis a company's ops/strategy
> team — or a state transport department building a case for a BVLOS
> corridor — would need to do before spending money on hardware or
> regulatory applications. We're demonstrating we can build that kind of
> tool, not claiming we've deployed it."

This is a legitimate contribution in the same sense a good feasibility
study or student research paper is: it adds a considered, calibrated data
point to a real ongoing question, even though nobody will deploy it
Monday morning.

## Suggested "so what" output for the demo

Add a synthesized readiness/justification metric to the dashboard — the
kind of summary line a real BVLOS corridor petition or internal ops
memo would need — e.g. combining failure rate, SLA compliance, and
cost-per-delivery delta vs. ground baseline into one headline number per
zone. This is the single feature that most clearly connects the simulation
to a real-world decision process, even though the simulation itself will
never make that decision for anyone.

## Future work (explicitly out of scope for this build, for transparency)

- Real OSM/GIS data instead of hand-placed canvas coordinates
- Real DGCA-published no-fly zone boundaries instead of approximated polygons
- Time-of-day demand seasonality (currently a flat Poisson rate)
- Exact ILP/OR-Tools solver comparison at larger scale (current brute-force
  check only scales to ~8 orders)
- Multi-day / multi-weather-scenario batch runs
- Real drone spec sheets (if/when a specific commercial drone is chosen)
  instead of calibrated-but-approximate constants
