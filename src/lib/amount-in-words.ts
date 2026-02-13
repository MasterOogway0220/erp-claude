const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function convertBelowThousand(num: number): string {
  if (num === 0) return "";

  let result = "";

  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + " Hundred";
    num %= 100;
    if (num > 0) result += " and ";
  }

  if (num >= 20) {
    result += tens[Math.floor(num / 10)];
    num %= 10;
    if (num > 0) result += " " + ones[num];
  } else if (num > 0) {
    result += ones[num];
  }

  return result;
}

function convertToIndianWords(num: number): string {
  if (num === 0) return "Zero";

  let result = "";

  // Crore (1,00,00,000)
  if (num >= 10000000) {
    result += convertBelowThousand(Math.floor(num / 10000000)) + " Crore ";
    num %= 10000000;
  }

  // Lakh (1,00,000)
  if (num >= 100000) {
    result += convertBelowThousand(Math.floor(num / 100000)) + " Lakh ";
    num %= 100000;
  }

  // Thousand
  if (num >= 1000) {
    result += convertBelowThousand(Math.floor(num / 1000)) + " Thousand ";
    num %= 1000;
  }

  if (num > 0) {
    result += convertBelowThousand(num);
  }

  return result.trim();
}

function convertToWesternWords(num: number): string {
  if (num === 0) return "Zero";

  let result = "";

  // Billion
  if (num >= 1000000000) {
    result += convertBelowThousand(Math.floor(num / 1000000000)) + " Billion ";
    num %= 1000000000;
  }

  // Million
  if (num >= 1000000) {
    result += convertBelowThousand(Math.floor(num / 1000000)) + " Million ";
    num %= 1000000;
  }

  // Thousand
  if (num >= 1000) {
    result += convertBelowThousand(Math.floor(num / 1000)) + " Thousand ";
    num %= 1000;
  }

  if (num > 0) {
    result += convertBelowThousand(num);
  }

  return result.trim();
}

export function numberToWords(amount: number, currency: string = "INR"): string {
  if (amount < 0) {
    return "Minus " + numberToWords(Math.abs(amount), currency);
  }

  const wholePart = Math.floor(amount);
  const decimalPart = Math.round((amount - wholePart) * 100);

  const isIndian = currency === "INR";
  const wholeWords = isIndian
    ? convertToIndianWords(wholePart)
    : convertToWesternWords(wholePart);

  let currencyName: string;
  let subunitName: string;

  switch (currency) {
    case "INR":
      currencyName = "Rupees";
      subunitName = "Paise";
      break;
    case "USD":
      currencyName = "US Dollars";
      subunitName = "Cents";
      break;
    case "EUR":
      currencyName = "Euros";
      subunitName = "Cents";
      break;
    case "AED":
      currencyName = "AED";
      subunitName = "Fils";
      break;
    default:
      currencyName = currency;
      subunitName = "Cents";
  }

  if (decimalPart > 0) {
    const decimalWords = isIndian
      ? convertToIndianWords(decimalPart)
      : convertToWesternWords(decimalPart);
    return `${currencyName} ${wholeWords} and ${decimalWords} ${subunitName} Only`;
  }

  return `${currencyName} ${wholeWords} Only`;
}
