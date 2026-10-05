export const generateReceiptNumber = (): string => {
  const todayIso = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RCPT-${todayIso}-${rand}`;
};

export const calculateFine = (
  pDateStr: string,
  dMonthStr: string,
  academicYear: string
): { fine: number; reason: string } => {
  if (!pDateStr || !dMonthStr) return { fine: 0, reason: "No payment date or due month specified" };
  const pDate = new Date(pDateStr);
  if (isNaN(pDate.getTime())) return { fine: 0, reason: "Invalid date" };

  const payYear = pDate.getFullYear();
  const payMonthIdx = pDate.getMonth(); // 0 to 11
  const payDay = pDate.getDate();

  const monthMap: Record<string, number> = {
    January: 0,
    February: 1,
    March: 2,
    April: 3,
    May: 4,
    June: 5,
    July: 6,
    August: 7,
    September: 8,
    October: 9,
    November: 10,
    December: 11,
  };

  const dueMonthIdx = monthMap[dMonthStr];
  if (dueMonthIdx === undefined) return { fine: 0, reason: "Standard on-time payment" };

  let dueYear = payYear;
  const parts = academicYear.split("-");
  const baseYear = parseInt(parts[0], 10) || payYear;

  if (dueMonthIdx >= 3) {
    dueYear = baseYear;
  } else {
    dueYear = baseYear + 1;
  }

  const payMonthCode = payYear * 12 + payMonthIdx;
  const dueMonthCode = dueYear * 12 + dueMonthIdx;

  if (payMonthCode < dueMonthCode) {
    return { fine: 0, reason: `Advance Payment for ${dMonthStr} (₹0 Fine)` };
  }

  if (payMonthCode === dueMonthCode) {
    if (payDay <= 10) {
      return { fine: 0, reason: `Paid on or before 10th of ${dMonthStr} (On-Time: ₹0 Fine)` };
    } else {
      return { fine: 50, reason: `Paid on ${pDateStr} (After 10th of ${dMonthStr}: ₹50 Late Fine applied)` };
    }
  }

  const diffMonths = payMonthCode - dueMonthCode;
  return {
    fine: 100,
    reason: `Overdue by ${diffMonths} month(s) (Paid in subsequent month: ₹100 Overdue Fine applied)`,
  };
};
