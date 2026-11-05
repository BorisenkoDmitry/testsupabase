import { Navigate } from "react-router";
import { useSession } from "@/entities/session";
import { LoginForm } from "@/features/auth";
import { dataProvider } from "@/shared/api";
export default function LoginPage() {
  const { user } = useSession();
  if (user)
    return (
      <Navigate
        to={user.role === "manager" ? "/objects" : "/my-tasks"}
        replace
      />
    );
  return (
    <div className="login-page">
      <main className="login-main">
        <div className="login-form-wrap">
          <span className="environment-badge">
            <span />
            {dataProvider === "mock"
              ? "Демо-режим · данные в браузере"
              : "Рабочее пространство · доступ по приглашению"}
          </span>
          <h1>Добро пожаловать</h1>
          <p className="login-intro">
            Войдите, чтобы продолжить работу с объектами и задачами.
          </p>
          <LoginForm />
          <p className="login-footnote">
            Самостоятельная регистрация не предусмотрена.
            <br />
            Доступ выдаёт администратор вашей компании.
          </p>
        </div>
      </main>
    </div>
  );
}
