export function generateReferralCode(fullname: string): string {
  const base = fullname.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'APX'
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${base}${rand}`.slice(0, 10)
}
