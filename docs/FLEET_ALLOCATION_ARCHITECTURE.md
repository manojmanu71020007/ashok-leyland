# Ashok Leyland Electric Bus Fleet — Allocation & Dispatch Architecture
**Depot 32 (Chandapura, Bengaluru)**  
**Fleet Asset: Ashok Leyland EiV12 AC Electric Bus (122 Vehicles)**

---

## 1. Executive Summary & Core Mental Model

To understand how the fleet at Depot 32 operates, think of it like a **professional sports team**:

* **122 Players (Buses) on the Roster:** The complete fleet registered at Depot 32 (`BM001` through `BM304`).
* **120 on the Field (Operational Duties):** The active timetable schedule runs required on daily operating routes.
* **2 on the Bench (Maintenance Reserves):** Standby buffer kept at the depot for servicing, battery inspections, and emergency breakdown relief (`122 - 120 = 2`).

Within the **120 operational duties**:
* **91 Starters with Designated Substitutes:** Explicitly pre-configured schedule duties having a primary bus (`FIX BM`) and a designated backup (`SWAP BM`).
* **29 Open Tactical Positions:** Daytime General Shift schedule duties dynamically fulfilled on the day of operation by available, fully-charged pool buses.

---

## 2. Depot Fleet Architecture Diagram

```
                       TOTAL DEPOT FLEET: 122 BUSES
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
 120 Operational Duties                                  2 Maintenance Spares
 (Every schedule run in timetable)                       (Depot reserve buffer)
         │
 ┌───────┴──────────────────────────┐
 ▼                                  ▼
91 Explicitly Pre-Assigned         29 Dynamically Allocated
(Fixed/Swap BM in Excel)           (Drawn from remaining pool buses)
```

---

## 3. The 91 "Explicitly Pre-Assigned" Duties

### Are these 91 buses locked to one route forever?
**No.** In electric transit depot management, **"FIX" means First Priority Assignment, not a permanent lock.**

Electric buses have dynamic State of Charge (SoC), charging durations, and daily inspections. The assigned bus (`FIX BM`) gets the first right to run the duty, but if it is charging, low on battery, or under repair, the designated **Swap Bus (`SWAP BM`)** steps in. If the swap bus is also unavailable, the **Smart Bus Swap Engine** automatically pulls the best available bus from the fleet pool.

### Decision Flow at Departure:
```
Departure Evaluation:
   Is Primary Bus (FIX BM) available?
   ├── Battery SoC >= Route Distance requirement?
   ├── Mechanical condition == "Good"?
   └── Driver assigned and ready?
        │
        ├── YES ──> FIX BM departs on schedule
        └── NO  ──> Check Designated Backup (SWAP BM)
                     │
                     ├── READY ──> SWAP BM dispatched
                     └── NOT READY ──> Smart Swap Engine assigns
                                       highest-SoC uncommitted pool bus
```

### Shift Composition of the 91 Explicit Duties:
| Shift Category | Count | Source in Master Sheet | Routes Covered | Operational Nature |
| :--- | :---: | :--- | :--- | :--- |
| **Night Halt (NH)** | **71** | `SCH DATA NH` (rows 4–74) | `600F`, `328H`, `361C`, `399C`, `KBS3A`, `KBS3F`, `356Z` | Long-distance schedules halting overnight at destination |
| **Shift B (Afternoon)** | **10** | `SCH DATA NH` (rows 76–85) | `356Z`, `360K`, `600F` | Afternoon-to-late evening duty pairings |
| **General Shift (600F)** | **10** | `Sheet2` (rows 16–25) | `600F` (Schedules `21`, `16`, `17`, `26`, `27`, `3`...) | Core trunk daytime corridor runs |
| **Total Explicit Duties** | **91** | | | **Pre-configured baseline pairing roster** |

---

## 4. The 29 "Dynamically Allocated" Schedules

### Why are these 29 schedules left without pre-fixed bus numbers?
These are daytime **General Shift** runs on routes `360K`, `KBS3A`, `KBS3F`, and `500DC`. Daytime schedules have flexible turnaround windows and do not require midnight overnight allocation. Pre-locking specific bus numbers days in advance would restrict depot agility and prevent optimal battery charging rotations.

### Inventory of the 29 Open Schedules:
| Route | Open Duties | Specific Schedule IDs | Service Corridor |
| :--- | :---: | :--- | :--- |
| **`KBS3A`** | **11** | `KBS3A/25`, `32`, `34`, `35`, `36`, `40`, `43`, `46`, `61`, `66`, `73` | Majestic ⇔ Anekal / Attibele |
| **`360K`** | **8** | `360K/5`, `10`, `11`, `12`, `20`, `26`, `33`, `34` | Chandapura ⇔ Majestic |
| **`KBS3F`** | **6** | `KBS3F/7`, `8`, `11`, `12`, `13`, `14` | Majestic ⇔ Basavanagudi |
| **`500DC`** | **4** | `500DC/12`, `13`, `14`, `15` | Anekal ⇔ Tin Factory via Dommasandra |
| **Total** | **29** | **29 Daytime General Shift Timetable Duties** | |

### When and How are they allocated?
Dynamic allocation occurs **on the day of operation** (typically 30–60 minutes prior to departure). The scheduling engine evaluates 4 gates:
1. **Battery Feasibility:** SoC > 25% and estimated range ($\text{km}$) $\ge$ GTFS route distance.
2. **Vehicle Health:** Telemetry condition is "Good" with no critical battery or motor alerts.
3. **Crew Availability:** Driver roster confirms an operator is checked in and assigned.
4. **Time-Slot Matrix:** Complies with Page 4 guidelines (matching Bus Category A/B/C to Peak or Off-Peak departure hours).

*Analogy:* Similar to modern on-demand ride dispatch (Uber/Ola)—instead of assigning a vehicle days in advance, the system matches the nearest ready, fully-charged vehicle to the schedule just in time.

---

## 5. Complete Accounting of All 122 Fleet Buses

| Fleet Operational Category | Bus Count | Operational Role & Identification |
| :--- | :---: | :--- |
| **Fixed Primary Fleet** | **~91 Buses** | Primary allocated vehicle for each pre-configured schedule. |
| **Backup / Swap Fleet** | **Overlapping** | Secondary assigned vehicles (drawn from active operational fleet). |
| **Dynamic Daytime Pool** | **~27–29 Buses** | Fleet vehicles (e.g. `BM004`, `BM019`, `BM032`, `BM052`, `BM107`, `BM116`...) assigned dynamically to the 29 open daytime duties. |
| **Depot Maintenance Spares** | **~2 Buses** | Standby reserve buffer ($122 - 120 = 2$) held back for preventive maintenance, detailing, and emergency relief. |
| **TOTAL DEPOT FLEET** | **122 BUSES** | **100% of physical Ashok Leyland electric vehicles accounted for.** |

---

## 6. Concrete Real-World Walkthrough

* **Duty Schedule:** `600F/91` (Bommasandra Depot 32 ➔ Basavanagudi)
* **Planned Departure:** 12:35 AM (Night Halt Shift) | **Route Distance:** 35.8 km
* **Pre-Assigned Fixed Bus:** `BM238` (`KA51AH4797`)
* **Designated Swap Bus:** `BM153` (`KA51AH3191`)

### Decision Sequence at 12:30 AM (5 minutes before departure):
1. **Check BM238:** Suppose `BM238` just returned from an evening run and sits at 18% SoC on the charger. Condition: *NOT READY*.
2. **Check BM153 (Swap Bus):** `BM153` sits at 88% SoC, condition Good, driver present. $\rightarrow$ **`BM153` is dispatched.**
3. **Alternative:** If `BM153` were also occupied, the Smart Bus Swap Engine queries the uncommitted pool buses, selects the top-SoC vehicle (e.g., `BM019` at 92%), reassigns it to `600F/91`, and updates the dispatch monitor.

---

## 7. Role of the Smart Bus Scheduling Software

The web platform replaces manual chalkboard tracking and late-night phone calls with **automated real-time optimization**:
* Reads live SoC and telemetry from `bus_state.json`.
* Correlates real GTFS route distances computed from stop coordinates.
* Automatically prioritizes Primary Fix $\rightarrow$ Swap $\rightarrow$ Dynamic Pool allocations.
* Ensures 100% on-time departures, zero mid-route battery depletion, and balanced fleet battery degradation.
