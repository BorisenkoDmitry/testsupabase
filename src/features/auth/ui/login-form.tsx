import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { api, dataProvider } from "@/shared/api";
import { demoUsers, DEMO_PASSWORD } from "@/shared/api/mock/seed";
import { sessionChanged, useSessionDispatch } from "@/entities/session";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Field } from "@/shared/ui/field";

const schema = z.object({
  email: z.email("Введите корректный email.").trim(),
  password: z.string().min(1, "Введите пароль."),
});
type LoginValues = z.infer<typeof schema>;
export function LoginForm() {
  const dispatch = useSessionDispatch();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const mutation = useMutation({
    mutationFn: (values: LoginValues) =>
      api.auth.signIn(values.email, values.password),
    onSuccess: (user) => {
      client.clear();
      dispatch(sessionChanged(user));
      navigate(user.role === "manager" ? "/objects" : "/my-tasks", {
        replace: true,
      });
    },
  });
  return (
    <>
      <form
        className="form-stack"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        <Field label="Email" error={errors.email?.message}>
          {(id) => (
            <Input
              id={id}
              type="email"
              autoComplete="username"
              placeholder="name@company.ru"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? `${id}-error` : undefined}
              {...register("email")}
            />
          )}
        </Field>
        <Field label="Пароль" error={errors.password?.message}>
          {(id) => (
            <div className="password-field">
              <Input
                id={id}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Введите пароль"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              <button
                type="button"
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}
        </Field>
        {mutation.error && (
          <p className="form-error" role="alert">
            {mutation.error.message}
          </p>
        )}
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="full-width"
        >
          {mutation.isPending ? (
            <Loader2 size={17} className="spin" />
          ) : (
            <LogIn size={17} />
          )}
          Войти в пространство
        </Button>
      </form>
      {dataProvider === "mock" && (
        <div className="demo-accounts">
          <div className="section-label">Попробуйте разные роли</div>
          <p>Выберите аккаунт — данные заполнятся автоматически.</p>
          {demoUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              disabled={mutation.isPending}
              onClick={() => {
                setValue("email", user.email, { shouldValidate: true });
                setValue("password", DEMO_PASSWORD, { shouldValidate: true });
                mutation.reset();
              }}
            >
              <span className="avatar avatar-small">
                {user.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")}
              </span>
              <span>
                <strong>{user.name}</strong>
                <small>
                  {user.role === "manager" ? "Постановщик" : "Исполнитель"} ·{" "}
                  {user.email}
                </small>
              </span>
              <span className="demo-fill">Выбрать →</span>
            </button>
          ))}
          <small>
            Пароль всех демо-аккаунтов: <code>{DEMO_PASSWORD}</code>
          </small>
        </div>
      )}
    </>
  );
}
