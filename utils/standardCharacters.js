module.exports = inputString => {
  const StandardCharactersPattern = /[^a-zA-Zа-яА-ЯёЁіІїЇєЄ0-9!@#$%^&*()_+=\-,.;\s]/;

  return !StandardCharactersPattern.test(inputString);
};
