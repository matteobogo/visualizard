export const CleanData = (data) => data.map(v => v.toLowerCase().replace(/[_]/g, ' '));

//check if all object's values are valid (not null/undefined/zero)
export const checkValuesExistanceOfObject = (obj) => Object.values(obj).every((v) => v);