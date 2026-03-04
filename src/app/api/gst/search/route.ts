import { NextRequest, NextResponse } from "next/server";

const GSTIN_STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

const ENTITY_TYPE_MAP: Record<string, string> = {
  P: "Proprietorship",
  C: "Private Limited",
  H: "HUF",
  F: "Partnership",
  A: "LLP",
  T: "LLP",
  B: "Partnership",
  L: "Limited",
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export async function GET(request: NextRequest) {
  const gstin = request.nextUrl.searchParams.get("gstin")?.toUpperCase();

  if (!gstin || !GSTIN_REGEX.test(gstin)) {
    return NextResponse.json({ error: "Invalid GSTIN format" }, { status: 400 });
  }

  const stateCode = gstin.slice(0, 2);
  const pan = gstin.slice(2, 12);
  const entityChar = gstin[12];

  const parsed = {
    pan,
    state: GSTIN_STATE_CODES[stateCode] ?? "",
    companyType: ENTITY_TYPE_MAP[entityChar] ?? "",
    country: "India",
  };

  // Try the GST portal public search API
  try {
    const res = await fetch(
      `https://api.gst.gov.in/commonapi/v1.1/search?gstin=${gstin}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(process.env.GST_API_TOKEN
            ? { Authorization: `Bearer ${process.env.GST_API_TOKEN}` }
            : {}),
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const tp = data?.taxpayerInfo ?? data;

      return NextResponse.json({
        ...parsed,
        companyName: tp?.lgnm ?? tp?.tradeNam ?? "",
        regAddressLine1: tp?.pradr?.adr ?? "",
        regCity: tp?.pradr?.dst ?? "",
        regState: tp?.pradr?.stcd ? (GSTIN_STATE_CODES[tp.pradr.stcd] ?? parsed.state) : parsed.state,
        regPincode: tp?.pradr?.pncd ?? "",
        fromApi: true,
      });
    }
  } catch {
    // API unavailable — return parsed data only
  }

  return NextResponse.json({ ...parsed, fromApi: false });
}
