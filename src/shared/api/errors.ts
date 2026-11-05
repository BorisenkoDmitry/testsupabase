export class CrmError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "CrmError";
  }
}

export const isConflict = (error: unknown) =>
  error instanceof CrmError && error.code === "40001";

export function apiError(error: { message: string; code?: string }): CrmError {
  if (error.code === "40001" || error.code === "PT409")
    return new CrmError(
      "Запись уже изменена другим пользователем. Данные обновлены — откройте форму заново и проверьте изменения.",
      "40001",
    );
  if (error.code === "invalid_credentials")
    return new CrmError("Неверный email или пароль.", error.code);
  if (
    error.code === "PGRST116" ||
    error.code === "22P02" ||
    error.code === "P0002"
  )
    return new CrmError("Запись не найдена или доступ ограничен.", error.code);
  if (error.code === "42501")
    return new CrmError("У вас нет прав на это действие.", error.code);
  if (error.code === "23503")
    return new CrmError("Сначала удалите активные задачи объекта.", error.code);
  if (error.code === "23514")
    return new CrmError(
      "Проверьте поля, назначенного исполнителя и допустимость перехода статуса. При возврате укажите причину.",
      error.code,
    );
  return new CrmError(
    /fetch|network|load failed/i.test(error.message)
      ? "Не удалось связаться с сервером. Проверьте соединение и повторите запрос."
      : "Не удалось выполнить запрос. Обновите страницу и попробуйте снова.",
    error.code,
  );
}
