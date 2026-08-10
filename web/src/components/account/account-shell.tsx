"use client";

import "@mantine/core/styles.css";

import { AppShell, Avatar, Burger, Group, NavLink, Stack, Text, createTheme, MantineProvider } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, LogOut, MapPin, Package, UserRound } from "lucide-react";
import { ReactNode, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { UserOutput } from "@/lib/api-types";

const theme = createTheme({
  primaryColor: "brand",
  primaryShade: 6,
  fontFamily: "var(--font-sans), Montserrat, sans-serif",
  headings: { fontFamily: "var(--font-sans), Montserrat, sans-serif" },
  defaultRadius: "md",
  colors: {
    brand: [
      "#fff1f1",
      "#ffd9da",
      "#ffb3b5",
      "#ff8a8d",
      "#fb6266",
      "#f23d42",
      "#c00612",
      "#a10510",
      "#870408",
      "#5c0206",
    ],
  },
});

const NAV_ITEMS = [
  { href: "/pedidos", label: "Meus pedidos", icon: Package },
  { href: "/enderecos", label: "Endereços", icon: MapPin },
  { href: "/perfil", label: "Meu perfil", icon: UserRound },
];

export function AccountShell({ user, children }: { user: UserOutput; children: ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiClient.post("/auth/logout");
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <MantineProvider theme={theme} forceColorScheme="light">
      <AppShell
        header={{ height: 60 }}
        navbar={{ width: 260, breakpoint: "sm", collapsed: { mobile: !opened } }}
        padding="lg"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group gap="sm">
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
              <Link
                href="/"
                aria-label="Sorofarma — página inicial"
                style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
              >
                <Image src="/sorofarma.png" alt="" width={40} height={36} priority className="h-9 w-auto" />
                <Text fw={800} c="brand.6" size="lg">
                  Sorofarma
                </Text>
              </Link>
              <Text c="dimmed" size="sm" visibleFrom="sm">
                Minha conta
              </Text>
            </Group>
            <Group gap="xs" visibleFrom="sm">
              <Avatar radius="xl" color="brand">
                {(user.fullName ?? user.username).charAt(0).toUpperCase()}
              </Avatar>
              <Text size="sm" fw={600}>
                {user.fullName ?? user.username}
              </Text>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <Stack gap={4} justify="space-between" h="100%">
            <Stack gap={4}>
              <NavLink
                component={Link}
                href="/"
                label="Voltar à loja"
                leftSection={<ArrowLeft size={18} />}
                onClick={close}
                mb="sm"
              />
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.href}
                  component={Link}
                  href={item.href}
                  prefetch={false}
                  label={item.label}
                  leftSection={<item.icon size={18} />}
                  active={pathname === item.href}
                  onClick={close}
                />
              ))}
            </Stack>
            <NavLink
              label={loggingOut ? "Saindo..." : "Sair"}
              leftSection={<LogOut size={18} />}
              onClick={handleLogout}
              disabled={loggingOut}
              c="red"
            />
          </Stack>
        </AppShell.Navbar>

        <AppShell.Main bg="var(--color-secondary)">{children}</AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}
