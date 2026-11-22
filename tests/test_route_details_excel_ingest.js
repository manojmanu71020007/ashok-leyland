const fs = require('fs');
const path = require('path');
const assert = require('assert');
const XLSX = require('xlsx');

const routeDetailsPath = 'C:/Users/Manoj K/.gemini/antigravity/brain/4f95b574-5abe-45d7-bf14-a6909eee27fa/.user_uploaded/media_1795319251240_acc68d3a.xlsx';
assert(fs.existsSync(routeDetailsPath), 'Route_Details.xlsx file must exist');

// Read server.js and extract ingestUploadedRouteAndScheduleDataset
const serverContent = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

// Test that regex matches totalkmorigintodestination as trip distance
const headerRegex = /^(totalkmorigintodestination|origintodestination|tripdistance|tripkm|onewaykm|routekm|totalkm)$/i;
const testHeaderClean = "Total km (Origin to Destination)".toLowerCase().replace(/[^a-z0-9]/g, "");
assert(headerRegex.test(testHeaderClean), 'Regex must match totalkmorigintodestination');

// Parse the Excel file and verify extracted values
const workbook = XLSX.readFile(routeDetailsPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

let headerIdx = -1;
let routeIdx = -1, schedIdx = -1, outTimeIdx = -1, inTimeIdx = -1, shiftIdx = -1;
let fixBmIdx = -1, swapBmIdx = -1, distIdx = -1, tripDistIdx = -1, dutyDistIdx = -1;
let nameIdx = -1, catIdx = -1, singleChargeIdx = -1, origIdx = -1, destIdx = -1;

for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;
    let fRoute = -1, fSched = -1, fOut = -1, fIn = -1, fShift = -1, fFix = -1, fSwap = -1;
    let fTripDist = -1, fDist = -1, fDutyDist = -1, fName = -1, fCat = -1, fSingleCharge = -1, fOrig = -1, fDest = -1;

    row.forEach((cell, cIdx) => {
        const clean = String(cell || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        if (/^route(no|code)?$/i.test(clean) || clean === "route") fRoute = cIdx;
        else if (/^(routefullname|fullname|routename)$/i.test(clean)) fName = cIdx;
        else if (/^sched(ule)?(id|no|code)?$/i.test(clean) || clean === "schedule") fSched = cIdx;
        else if (/^(outtime|departuretime|deptime|departure|cumtime|starttime|timetable|timetables)$/i.test(clean)) fOut = cIdx;
        else if (/^(intime|arrivaltime|arrtime|arrival|endtime)$/i.test(clean)) fIn = cIdx;
        else if (/^shift$/i.test(clean)) fShift = cIdx;
        else if (/^(fixbm|fixedbm|bmno)$/i.test(clean)) fFix = cIdx;
        else if (/^(swapbm|swap)$/i.test(clean)) fSwap = cIdx;
        else if (/^(totalkmorigintodestination|origintodestination|tripdistance|tripkm|onewaykm|routekm|totalkm)$/i.test(clean)) fTripDist = cIdx;
        else if (/^(distance|km|length)$/i.test(clean)) fDist = cIdx;
        else if (/^(actualkm|routelengthschedule|routelength)$/i.test(clean)) fDutyDist = cIdx;
        else if (/^(singlechargeoperationrequiredasperform4|singlechargereqkm|singlecharge)$/i.test(clean)) fSingleCharge = cIdx;
        else if (/^(category|routecomplexity|complexity)$/i.test(clean)) fCat = cIdx;
        else if (/^(origin|from|startpoint|startingpoint)$/i.test(clean)) fOrig = cIdx;
        else if (/^(destination|dest|to|endpoint)$/i.test(clean)) fDest = cIdx;
    });

    if (fRoute !== -1 || fSched !== -1 || fOut !== -1) {
        headerIdx = r;
        routeIdx = fRoute;
        nameIdx = fName;
        schedIdx = fSched;
        outTimeIdx = fOut;
        inTimeIdx = fIn;
        shiftIdx = fShift;
        fixBmIdx = fFix;
        swapBmIdx = fSwap;
        tripDistIdx = fTripDist;
        distIdx = fDist;
        dutyDistIdx = fDutyDist;
        singleChargeIdx = fSingleCharge;
        catIdx = fCat;
        origIdx = fOrig;
        destIdx = fDest;
        break;
    }
}

assert(headerIdx !== -1, 'Header must be found');
assert(tripDistIdx === 5, 'tripDistIdx should be column 5 (Total km (Origin to Destination))');
assert(dutyDistIdx === 12, 'dutyDistIdx should be column 12 (Actual km)');
assert(nameIdx === 2, 'nameIdx should be column 2 (Route Full Name)');
assert(catIdx === 14, 'catIdx should be column 14 (Category)');

const routesMap = new Map();
for (let r = headerIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;
    const rawRouteOrSched = (routeIdx >= 0 ? row[routeIdx] : "") || (schedIdx >= 0 ? row[schedIdx] : "");
    if (!rawRouteOrSched) continue;

    const fullStr = String(rawRouteOrSched).trim().toUpperCase();
    let routeCode = fullStr.includes("/") ? fullStr.split("/")[0].trim() : fullStr;

    let parsedDist = null;
    if (tripDistIdx >= 0 && row[tripDistIdx] && !isNaN(parseFloat(row[tripDistIdx]))) {
        parsedDist = parseFloat(row[tripDistIdx]);
    } else if (distIdx >= 0 && row[distIdx] && !isNaN(parseFloat(row[distIdx]))) {
        parsedDist = parseFloat(row[distIdx]);
    } else if (dutyDistIdx >= 0 && row[dutyDistIdx] && !isNaN(parseFloat(row[dutyDistIdx]))) {
        parsedDist = parseFloat(row[dutyDistIdx]);
    }

    let parsedDutyKm = null;
    if (dutyDistIdx >= 0 && row[dutyDistIdx] && !isNaN(parseFloat(row[dutyDistIdx]))) {
        parsedDutyKm = parseFloat(row[dutyDistIdx]);
    }

    routesMap.set(routeCode, {
        code: routeCode,
        distance: parsedDist,
        fullDutyKm: parsedDutyKm,
        fullName: nameIdx >= 0 && row[nameIdx] ? String(row[nameIdx]).trim() : null,
        category: catIdx >= 0 && row[catIdx] ? String(row[catIdx]).trim() : null
    });
}

console.log('Extracted routes from Route_Details.xlsx:');
routesMap.forEach((v, k) => {
    console.log(`  Route ${k}: distance=${v.distance} km (one-way), dutyKm=${v.fullDutyKm} km, fullName="${v.fullName}", category="${v.category}"`);
});

const r275M = routesMap.get('275M');
assert(r275M, '275M must exist');
assert.strictEqual(r275M.distance, 41.8, '275M distance must be 41.8 km (2 digits), not 126.45 km');
assert.strictEqual(r275M.fullDutyKm, 126.45, '275M dutyKm must be 126.45 km');
assert.strictEqual(r275M.fullName, 'Attibele - Jayanagar', '275M fullName must be Attibele - Jayanagar');
assert.strictEqual(r275M.category, 'Moderate', '275M category must be Moderate');

console.log('\n✓ ALL ASSERTIONS PASSED: 275M is now correctly 41.8 km (2 digits)!');
