import { AppModule } from "./infra/module/AppModule";

const port = Number(process.env.PORT) || 3000;
const app = new AppModule();
await app.listen(port);
