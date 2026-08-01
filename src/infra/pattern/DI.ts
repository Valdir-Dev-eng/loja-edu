export class DependencyInjection {
    private dependency:Map<any,any> = new Map()
    constructor() {}
    addDependency<T>(adapter:T, port:Function):void{
        if(this.dependency.get(port))
            throw new Error("Dependency Already Registred: "+port)
        this.dependency.set(port,adapter)
    }

    getDependency<T>(port:Function):T{
        const dependency = this.dependency.get(port)
        if(dependency)
            return dependency

        throw new Error("Dependency "+port+" Not Found")
    }
}