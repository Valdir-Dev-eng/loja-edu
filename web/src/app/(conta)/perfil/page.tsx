import { redirect } from "next/navigation";
import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { getSessionUser } from "@/lib/session";

export default async function PerfilPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <Stack gap="lg" maw={520}>
      <Title order={2}>Meu perfil</Title>

      <Card withBorder radius="lg" p="lg">
        <Stack gap="md">
          <Field label="Nome completo" value={user.fullName ?? "—"} />
          <Field label="E-mail" value={user.email} />
          <Field label="Usuário" value={user.username} />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Status do cadastro
            </Text>
            <Badge color={user.onboardingCompleted ? "green" : "yellow"} variant="light">
              {user.onboardingCompleted ? "Completo" : "Pendente"}
            </Badge>
          </Group>
        </Stack>
      </Card>

      <Text size="xs" c="dimmed">
        Para alterar seus dados cadastrais, entre em contato com o nosso atendimento.
      </Text>
    </Stack>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={600}>
        {value}
      </Text>
    </Group>
  );
}
