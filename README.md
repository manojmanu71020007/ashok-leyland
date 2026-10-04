# Battery-Based Bus Allocation Tool — Chandapura Depot

A comprehensive, prototype **Battery-Based Bus Allocation Tool** for the Ashok Leyland electric bus depot at **Chandapura, Bengaluru**.

The tool determines whether each electric bus can safely perform each scheduled transit duty based on route distance, dead km, charging opportunities, longest operating stretch, bus actual range (incorporating battery degradation), confirmed manual state-of-charge (SOC), reserve buffer, turnaround layover, Night Halt commitments, and duty chaining.

---

## 1. Core Operational Workflow

The depot currently updates bus SOC manually after charging rather than relying on live telemetry. Therefore, the system operates as a **manual-SOC route feasibility and bus allocation engine**.

```text
Operator updates current SOC manually
          ↓
Select Shift + Schedule/Route
          ↓
System reads:
• Route
• Schedule
• Departure / Arrival
• Shift
• Complexity
• Charging points / stretch
• Dead km
• Bus range
• Existing bus commitments
          ↓
Calculate required SOC (estimate_route_requirement)
          ↓
Compare current SOC of each available bus (estimate_bus_soc_requirement)
          ↓
Check time compatibility / turnaround / Night Halt
          ↓
Recommend suitable bus (Ranked by Section 18 priorities, conserving Category A)
          ↓
Allocate bus (or Manager Manual Override)
          ↓
After the bus charges again:
Operator manually updates its new SOC
          ↓
Estimator recalculates next allocation
```

### The 5 Operational Steps

1. **Step 1 — Manual SOC Update**: Operator enters the latest confirmed SOC for each bus (e.g., `BM273 = 84%`). This is stored as the bus's **Confirmed Manual SOC**. The system never automatically resets this to 100% simply because a charging row exists in Form 4.
2. **Step 2 — Select Duty**: Operator selects Shift $\rightarrow$ Route $\rightarrow$ Schedule.
3. **Step 3 — Route / Stretch Estimator (`estimate_route_requirement`)**: Calculates pure distance requirements of the duty **independently of any bus**. Shows First Stretch km, Longest Stretch km, Form 4 Single-Charge km, Target Distance ($1.10\times$ dead-km allowance), and charging points.
4. **Step 4 — Bus-Specific SOC Estimator (`estimate_bus_soc_requirement`)**: For each candidate bus, calculates its own SOC requirement using its individual `Actual Range Final`:
   $$\text{Base Required SOC \%} = \frac{\text{Target Distance}}{\text{Bus Actual Range Final}} \times 100$$
   $$\text{Required SOC \%} = \text{Base Required SOC \%} + \text{RESERVE\_PCT}$$
   *The same route produces different SOC requirements for different buses (e.g., for `500DC/14`, BM273 needs 74.14% while BM004 needs 97.91%).*
5. **Step 5 — Candidate Comparison & Allocation**: Compares confirmed manual SOC against required SOC, checks turnaround time, defect flags, and Night Halt commitments. Recommends the optimal bus with smallest sufficient surplus to conserve high-range Category A buses for demanding duties.

---

## 2. Key Architecture & Components

```text
├── data/                                         # Normalized depot source files
│   ├── Form_4_Shift_A.xlsx                       # Trip duty card for Shift A
│   ├── Form_4_Shift_B.xlsx                       # Trip duty card for Shift B
│   ├── Form_4_General.xlsx                       # Trip duty card for General Shift
│   ├── Form_4_Night_Hault.xlsx                   # Trip duty card for Night Halt
│   ├── Form_4_Consolidation_-_Chandapura.xlsx    # Master schedules and bus degradation ranges
│   ├── SCH_DATA_NH_new__1_.xlsx                  # Night Halt commitments, VEH.NO mapping
│   └── OHM_004-_Check_sheet_for_inspection.xlsx  # Inspection templates & KPI monitoring
├── models.py                                     # Pure Pydantic data models
├── data_loader.py                                # Excel parsers, time parsing, charging detection
├── validation.py                                 # 4 candidate stretch rules (Rule C 86.2% match)
├── fleet.py                                      # FleetManager: manual SOC, defect flags, assignments
├── allocator.py                                  # Core business logic: estimators, candidate ranking
├── optimizer.py                                  # Duty chaining, Hungarian linear_sum_assignment, NH swap engine, spare pool, headway gaps
├── export_excel.py                               # 11-sheet Excel export generator
├── app.py                                        # Interactive Streamlit Web Dashboard
└── tests/                                        # Pytest automated test suite (53 passing tests)
    ├── test_stage1.py                            # Data loaders, time parsing, benchmarks
    ├── test_stage2.py                            # Fleet state, ranking, infeasible reports, defect workflow
    └── test_stage3.py                            # Duty chains, Hungarian optimization, swaps, spare pool
```

---

## 3. Mathematical Foundations & Benchmarks

### Dead-KM Treatment
$$\text{Target Distance (km)} = \text{Operating Stretch (km)} \times 1.10$$
*Derived from the consolidation workbook ratio: $\text{Route Length} \times 1.10 \approx \text{Actual KM}$.*

### Physical Feasibility Thresholds
- **Eligible from Full Charge**: $\text{Base Required SOC} \le 100\%$ and $\text{Required SOC With Reserve} \le 100\%$.
- **Reserve-Infeasible**: $\text{Base Required SOC} \le 100\%$, but $\text{Base Required SOC} + \text{Reserve} > 100\%$.
- **Physically Impossible**: $\text{Base Required SOC} > 100\%$ on the highest-range bus in the fleet (`BM273` with $136.34\text{ km}$).

### Benchmark Validations
- **`500DC/14` (General Shift)**:
  - Form 4 Longest Stretch: $91.9\text{ km}$
  - Target Distance: $91.9 \times 1.10 = 101.09\text{ km}$
  - First Stretch before CSB charging: $79.5\text{ km}$
  - `BM273` ($136.34\text{ km}$ range): Base Required SOC $= 101.09 / 136.34 \times 100 = 74.14\%$
  - `BM004` ($103.24\text{ km}$ range): Base Required SOC $= 101.09 / 103.24 \times 100 = 97.91\%$
- **`KBS3F/15` through `KBS3F/18` (Night Halt)**:
  - Form 4 Longest Stretch: $146.9\text{ km}$
  - Target Distance: $146.9 \times 1.10 = 161.59\text{ km}$
  - Shortfall against highest-range bus (`BM273`): $161.59 - 136.34 = 25.25\text{ km}$
  - Feasibility Status: **`PHYSICALLY IMPOSSIBLE`** (Base SOC on BM273 $= 118.52\%$).

---

## 4. Key Operational Features

### 1. Shift A $\rightarrow$ Shift B Compatible Duty Chaining
Pairs Shift A schedules with Shift B schedules having $\ge 20\text{ min}$ turnaround layover:
- All 10 Shift A duties pair with their exact matching schedule ID in Shift B with $40$ to $45\text{ min}$ turnaround.
- Forms **120 duty chains** representing the depot's **130 schedules**.

### 2. Multi-Duty Auto-Allocation (`scipy.optimize.linear_sum_assignment`)
Uses the Hungarian algorithm to optimize bus-to-duty-chain assignment:
- **Hard Constraints**: Defective buses, maintenance buses, and range-deficient buses are excluded ($10^7$ cost penalty).
- **Complexity Tier Alignment**: Strongly penalizes allocating Category A buses to Standard routes (+200 penalty) to conserve high-range capacity for Complex routes.
- **Surplus Minimization**: Penalizes excessive surplus range ($0.4 \times \text{surplus km}$) and excessive SOC surplus.

### 3. Night Halt Allocation & Swap Engine
Cross-references the 71 Night Halt duties against `SCH DATA NH`:
- Normalizes **70 midnight-crossing schedules** (Arrival clock $<$ Departure clock $\implies$ next day).
- Detects required swaps when `FIX BM != BM NO`, when the actual bus has a defect, or when its degraded range $<$ target distance.
- **General-Shift Unknown Policy**: Exactly 39 General-shift duties are not present in `SCH DATA NH`. The system marks each as `Current Assignment = Unknown` without guessing.

### 4. Dynamic Operational Spare Pool
Evaluates vehicle demand across the minute-by-minute timeline ($0 \dots 1439\text{ min}$):
- **Peak Simultaneous Demand**: **119 buses** at **16:25**.
- **Operational Spare Pool at Peak**: $\text{Total Fleet (122)} - \text{Peak Demand (119)} - \text{Defective} - \text{Maintenance} = \mathbf{3\text{ buses}}$.
- During off-peak periods (midday/overnight), over 50 buses are available as operational spares.

### 5. Route Headway Gap Finder
Audits consecutive departures for each `(Route, Origin)`:
- Flags service gaps exceeding 60 minutes.
- Identifies free candidate spare buses with sufficient range and SOC, recommending lower-range vehicles to preserve Category A buses.

---

## 5. Verification & Testing

Run the complete test suite:
```powershell
.venv\Scripts\python.exe -m pytest tests/
```
All **53 automated unit and integration tests** pass:
- `test_stage1.py`: 18 tests (data loaders, time parsing, midnight detection, candidate stretch rules, Form 4 consistency).
- `test_stage2.py`: 8 tests (fleet state, ranking criteria, manual overrides, infeasible reports, faulty bus workflow).
- `test_stage3.py`: 10 tests (duty chaining, Hungarian auto-allocation, turnaround charging, Night Halt swaps, spare pool, headway gaps).
- Legacy estimator & allocator tests: 17 tests.

---

## 6. How to Run the Dashboard

To launch the Streamlit Web Dashboard:
```powershell
.venv\Scripts\streamlit run app.py
```
Open your browser at `http://localhost:8501`.
The dashboard includes tabs for:
1. **Core Operational Workflow** (Manual SOC update, duty selection, distance estimator, bus-specific SOC estimator, candidate ranking).
2. **Depot Auto-Allocation** (Hungarian multi-duty optimization).
3. **Fleet State & Defect Management** (122 buses, degradation range, manual SOC, defect toggling).
4. **Night Halt & Swaps** (SCH DATA NH comparison and 39 General-shift Unknowns).
5. **Dynamic Spare Pool & 24h Timeline** (Peak demand 119 buses, spare count).
6. **Route Headway Gap Finder** (>60 min service intervals).
7. **Infeasible & Sensitivity Reports**.
8. **Bus Reuse & CSB Deadhead Calculator**.
9. **11-Sheet Excel Export** (one-click download of `Chandapura_Depot_Battery_Allocation.xlsx`).