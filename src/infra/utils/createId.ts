import { v4 as uuidv4 } from 'uuid'
import { CreateId } from '../../domain/interface/CreateId';


export const createIdAdapter:CreateId = () => uuidv4();



