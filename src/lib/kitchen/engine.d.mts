export const KITCHEN_TIMING:Readonly<{chop:number;cook:number;wash:number;burn:number;warning:number;plateReturn:number}>
export type Point = {x:number;y:number}
export type KitchenInteraction = {id:number;station:string;item:string;kind:'pickup'|'place';at:number;actionId?:string}
export type KitchenPlayer = Point & {motionId?:number;motion?:{id:number;x:number;y:number;dt:number}[];path:Point[];startedAt:number;target:string|null;held:string|null;notice:string;commandId?:string;facing?:Point;walking?:boolean;interaction?:KitchenInteraction;lastActionId?:string}
export type Station = {id:string;type:string;label:string;x:number;y:number;ingredient?:string}
export type Kitchen = {revision:number;startedAt:number;served:number;players:Record<number,KitchenPlayer>;stations:Record<string,{ingredients:string[];item:string|null;readyAt:number;count?:number;returnAt?:number[];lastReturnAt?:number;worker?:number|null;remainingMs?:number;workStartedAt?:number}>;orders:{id:number;ingredients:string[]}[]}
export const WIDTH:number, HEIGHT:number, STEP_MS:number
export const STATIONS:Station[]
export const recipes:string[][]
export function isFloor(x:number,y:number):boolean
export function findPath(start:Point,end:Point):Point[]|null
export function createKitchen(now?:number):Kitchen
export function joinKitchen(state:Kitchen,seat:number):void
export function positionAt(player:KitchenPlayer,now:number):Point
export function advanceKitchen(state:Kitchen,now?:number):void
export function commandKitchen(state:Kitchen,seat:number,body:{op:string;station?:string;destination?:Point;commandId?:string;steps?:InputStep[]},now?:number):void

export function movementDuration(player:KitchenPlayer):number
export function planMovement(player:KitchenPlayer,body:{station?:string;destination?:Point},now:number):KitchenPlayer

export type InteractionIntent = {station:string;held:string|null}
export type InputStep = {x:number;y:number;dt:number;dash?:boolean;activate?:false;pauseWork?:false} | {activate:true;pauseWork?:false;actionId?:string;at?:number;intent?:InteractionIntent} | {pauseWork:true;activate?:false;actionId?:string;at?:number}
export const WALK_SPEED:number, PLAYER_RADIUS:number
export function canStand(x:number,y:number):boolean
export function moveFreely(player:KitchenPlayer,input:Point & {dash?:boolean},dt:number):KitchenPlayer
export function nearbyStation(player:KitchenPlayer):Station|null

export function returnedPlateCount(station:Kitchen['stations'][string]|undefined,now?:number):number
