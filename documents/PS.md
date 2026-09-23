# Problem Statement (PS)

**Project:** Bhopal Drone Delivery Feasibility Simulator
**Event:** Claude Fable hackathon (3–4hr build)
**Team scope:** Software + mathematics only. Hardware, manufacturing, and
regulatory certification are explicitly out of scope.

---

## 1. The problem, stated plainly

Quick-commerce platforms in India (Blinkit, Zepto, Instamart-style
services) currently rely almost entirely on ground riders to hit 10–20
minute delivery SLAs. In a city like Bhopal — large lakes, hilly terrain,
VVIP/no-fly airspace, and a mix of dense old-city streets and sparse
new-city sprawl — ground delivery time is inconsistent and traffic-bound.

Drone delivery is technically proposed as an alternative, and has been
**actively piloted by major Indian players** (see Research, below) — but no
public, reusable, physics-grounded tool exists to answer, for a *specific*
city and a *specific* fleet configuration:

> **Under what conditions — payload, weather, order density, no-fly
> geography — would a drone fleet actually outperform ground riders on
> delivery time, cost, and reliability, and by how much?**

This project builds that tool, as a research/feasibility artifact, using
Bhopal as the case study city.

## 2. Why this is a real (if narrow) problem

### 2.1 Industry precedent — this question is actively being asked

- Swiggy piloted drone-based delivery for its grocery service, Instamart,
  selecting multiple drone operators (Garuda Aerospace, Skye Air Mobility,
  ANRA Technologies/TechEagle, Marut Dronetech) to run trials, initially
  targeting the **middle-mile** leg (warehouse to dark store) rather than
  direct-to-consumer delivery.
- Zomato separately pursued **last-mile** drone delivery after acquiring
  drone startup TechEagle, and ran a public non-commercial test flight in
  2019: a 5 kg payload carried 5 km in 10 minutes, reaching a peak speed of
  80 km/h — explicitly benchmarked by Zomato's CEO against their own
  bike-fleet average of 30.5 minutes for comparable deliveries.
- The DGCA (Directorate General of Civil Aviation) ran a formal BVLOS
  (Beyond Visual Line of Sight) trial program in 2020 involving a
  13-company consortium including Zomato, Swiggy, Dunzo, SpiceJet, and
  Asteria Aerospace, specifically to gather flight-hour data to inform
  future drone delivery policy.
- As of 2026, only a subset of pilot programs have actually executed
  (reporting indicates Garuda Aerospace ran its Swiggy pilot; other
  selected operators were still awaiting permission), underscoring that
  **regulatory and operational execution, not the underlying feasibility
  question, is the current bottleneck** — see Section 4.

### 2.2 Regulatory context — real, current, and directly relevant to constraints

- DGCA's Drone Rules classify UAS into five weight categories (Nano, Micro,
  Small, Medium, Large) with escalating registration, pilot licensing
  (Remote Pilot Certificate), and Drone Operator Permit requirements as
  weight increases.
- BVLOS commercial operations require explicit, case-by-case DGCA approval;
  as of 2026, initial approved BVLOS delivery/logistics corridors are
  reported in Telangana, Uttarakhand, and Gujarat, with additional
  corridors in Ladakh (mineral survey) and Andhra Pradesh (coastal
  monitoring). **Madhya Pradesh (Bhopal) does not currently have a
  published BVLOS delivery corridor.**
- No-fly airspace is defined by Red/Yellow/Green zone classification: Red
  zones (strictly no-fly) include a 5 km radius around airports with
  scheduled commercial service, plus permanently restricted sensitive
  government sites; Yellow zones require manual DGCA clearance with up to
  24-hour processing; Green zones allow automated approval up to 400 feet.
  These constraints directly informed the no-fly zone design in this
  project's map model (`data/bhopal_map.json`, `docs/MAP.md`).

### 2.3 Open industry debate — this project produces one data point, not a verdict

Reporting on India's drone delivery sector notes genuine disagreement: some
industry observers argue drone delivery is better suited to
high-labor-cost economies (e.g. the US), and that India's comparatively
low labor cost may not justify the switch economically; drone-industry
executives (e.g. Scandron's CEO) publicly disagree, projecting large-scale
fleet deployment (10,000–15,000 drones, ₹500–600 crore turnover). This
project's simulation produces a concrete, reproducible number under
explicit assumptions — a genuine contribution to that debate, not a
resolution of it.

## 3. Scope boundaries

**In scope (this project delivers):**
- A physics-based energy/power model for multirotor drones, calibrated
  against Zomato's public 2019 test flight
- A city graph model of Bhopal (stylized 2D, geographically informed) with
  real-world-derived no-fly zone placement (lakes, VVIP zones, airport
  buffer)
- An energy-aware A* pathfinding layer and a formal multi-objective
  fleet-assignment optimization (E-VRPTW variant), validated against exact
  optimal on small instances
- A comparative simulation: drone fleet vs. ground rider fleet vs. mixed,
  under identical Poisson-distributed demand
- A 2D game-style visual playback of simulation results

**Explicitly out of scope:**
- Any physical hardware, drone construction, or flight testing
- DGCA registration, certification, or regulatory filing of any kind
- Claims that this tool is deployable, adopted, or requested by any real
  company, city, or regulator
- Real-time GPS/OSM map data (map is stylized, see `docs/MAP.md`)
- Resolving the industry disagreement described in Section 2.3

## 4. The honest "why build this" answer

The real bottleneck to drone delivery in India, per the research above, is
**regulatory approval and hardware/certification cost — not a lack of
feasibility analysis tools.** This project does not move that bottleneck.
What it does provide: a reproducible, physics-grounded methodology that a
company's ops/strategy team, or a state transport department building a
case for a new BVLOS corridor, would need to produce internally before
committing capital or filing for regulatory approval. That is a legitimate,
narrow research contribution — not a product, and not a claim of
real-world adoption. See `docs/RESEARCH.md` for the full framing and
`docs/OPTIMIZATION.md` / `docs/PHYSICS.md` for the technical rigor backing
that claim.

## 5. Success criteria for this build

1. Physics model reproduces the Zomato reference flight's trip time within
   a defensible margin after calibration (see `engine/calibration.py`).
2. Greedy fleet-assignment heuristic is validated against exact
   brute-force-optimal on a tractable instance, with the gap reported
   plainly (not hidden if nonzero).
3. Simulation produces a clear, quotable comparative result (drone vs.
   ground vs. mixed fleet) on realistic Bhopal-informed geography and
   demand.
4. No claim in any pitch material overstates real-world deployability
   beyond what Section 4 supports.

## References

- Zomato drone test flight (2019): TechCrunch, "India's Zomato flies drone
  to deliver food in successful test"
- Swiggy Instamart drone pilots: BW Disrupt, "Swiggy Set To Pilot
  Drone-Based Deliveries For Its Grocery Service Instamart"; Inc42,
  "Swiggy To Soon Pilot 'Middle-Mile' Drone Delivery: CTO Dale Vaz"
- DGCA BVLOS consortium trials (2020): KrASIA / Beebom / TechRadar / Hindustan
  Times coverage of the Clearsky Flight consortium and BEAM committee
- DGCA Drone Rules, weight categories, BVLOS corridors, Red/Yellow/Green
  zones (2026): Zbotic, BharatSkyTech, TheRetroAviation, UAVMODEL Insights
  DGCA regulatory summaries
- Industry feasibility debate: Deccan Herald, "Home delivery with drones in
  India still a long way to go"
