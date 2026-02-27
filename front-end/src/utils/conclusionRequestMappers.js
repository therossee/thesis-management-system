// components/conclusion-request/utils/mappers.js
export const toOption = teacher => ({
  id: teacher.id,
  value: teacher.id,
  firstName: teacher.firstName,
  lastName: teacher.lastName,
  label: `${teacher.lastName} ${teacher.firstName}`,
  email: teacher.email,
  variant: 'teacher',
});

export const makeTeacherOverviewPayload =
  (teachers = []) =>
  coSupervisor => {
    const teacherId = coSupervisor?.value ?? coSupervisor?.id ?? coSupervisor;
    const teacher = teachers.find(item => item.id === teacherId);

    if (!teacher) {
      if (
        coSupervisor &&
        Number.isInteger(Number(coSupervisor.id ?? coSupervisor.value)) &&
        coSupervisor.firstName &&
        coSupervisor.lastName
      ) {
        return {
          id: Number(coSupervisor.id ?? coSupervisor.value),
          firstName: coSupervisor.firstName,
          lastName: coSupervisor.lastName,
          email: coSupervisor.email ?? undefined,
        };
      }
      return null;
    }

    return {
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email ?? undefined,
    };
  };

export const toKeywordPayload = keyword => {
  if (typeof keyword === 'string') {
    const trimmed = keyword.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!keyword || typeof keyword !== 'object') return null;

  const keywordId = Number(keyword.id ?? keyword.value);
  const keywordText = keyword.keyword ?? keyword.label ?? (typeof keyword.value === 'string' ? keyword.value : null);

  if (
    Number.isInteger(keywordId) &&
    keywordId > 0 &&
    typeof keywordText === 'string' &&
    keywordText.trim().length > 0
  ) {
    return {
      id: keywordId,
      keyword: keywordText.trim(),
    };
  }

  if (typeof keywordText === 'string' && keywordText.trim().length > 0) {
    return keywordText.trim();
  }

  return null;
};
