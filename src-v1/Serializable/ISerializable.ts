export default interface ISerializable {
    serialize(...args: any[]): string;
    deserialize(json: string): void;
}
