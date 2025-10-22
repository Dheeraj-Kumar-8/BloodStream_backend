const bloodCompatibilityMatrix = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
};

const isCompatible = (donorType, recipientType) => {
  if (!donorType || !recipientType) return false;
  const accepted = bloodCompatibilityMatrix[recipientType] || [];
  return accepted.includes(donorType);
};

const compatibilityScore = (donorType, recipientType) => {
  if (!isCompatible(donorType, recipientType)) return 0;
  if (donorType === recipientType) return 1;
  if (recipientType.startsWith('AB')) return 0.9;
  if (donorType.startsWith('O')) return 0.85;
  return 0.8;
};

module.exports = {
  isCompatible,
  compatibilityScore,
};
