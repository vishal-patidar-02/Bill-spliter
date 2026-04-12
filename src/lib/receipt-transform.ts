import { Expense, Payer, ReceiptLineAssignment, ReceiptToExpenseInput, Split } from './types';
import { roundMoney } from './utils';

function buildEqualSplits(memberIds: string[], amount: number): Split[] {
  if (!memberIds.length || amount <= 0) return [];

  const perPerson = roundMoney(amount / memberIds.length);
  const diff = roundMoney(amount - perPerson * memberIds.length);

  return memberIds.map((memberId, index) => ({
    memberId,
    amount: index === 0 ? roundMoney(perPerson + diff) : perPerson,
  }));
}

function makeExpensePayload(title: string, amount: number, payerId: string, memberIds: string[], category: ReceiptToExpenseInput['category'], notes: string): Omit<Expense, 'id' | 'createdAt'> | null {
  const safeAmount = roundMoney(amount);
  if (safeAmount <= 0 || !memberIds.length) return null;

  const payers: Payer[] = [{ memberId: payerId, amount: safeAmount }];
  const splits = buildEqualSplits(memberIds, safeAmount);
  if (!splits.length) return null;

  return {
    title,
    amount: safeAmount,
    payers,
    splits,
    category,
    notes,
  };
}

export function buildExpensesFromReceipt(input: ReceiptToExpenseInput): Array<Omit<Expense, 'id' | 'createdAt'>> {
  const { draft, assignments, payerId, category, notes, taxMemberIds, tipMemberIds } = input;
  const assignmentMap = new Map<string, ReceiptLineAssignment>();

  assignments.forEach((entry) => {
    assignmentMap.set(entry.lineItemId, entry);
  });

  const generated = draft.lineItems
    .filter((line) => line.include && line.totalPrice > 0)
    .map((line) => {
      const assignment = assignmentMap.get(line.id);
      return makeExpensePayload(
        line.name,
        line.totalPrice,
        payerId,
        assignment?.memberIds || [],
        category,
        notes || `Imported from receipt: ${draft.merchant}`
      );
    })
    .filter((entry): entry is Omit<Expense, 'id' | 'createdAt'> => Boolean(entry));

  const taxExpense = makeExpensePayload(
    `${draft.merchant} tax`,
    draft.tax,
    payerId,
    taxMemberIds,
    category,
    notes || `Imported from receipt: ${draft.merchant}`
  );

  const tipExpense = makeExpensePayload(
    `${draft.merchant} tip`,
    draft.tip,
    payerId,
    tipMemberIds,
    category,
    notes || `Imported from receipt: ${draft.merchant}`
  );

  if (taxExpense) generated.push(taxExpense);
  if (tipExpense) generated.push(tipExpense);

  return generated;
}
