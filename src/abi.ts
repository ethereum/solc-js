import semver = require('semver');

//from solidity documentation https://solidity.readthedocs.io/en/develop/abi-spec.html#json

interface inputObject{
    name: string,
    type: any,
    components: any,
    indexed?: boolean
}
export interface ABI {
    type: "function" |"constructor" | "fallback" | "event" | "receive";
    name?: string;
    inputs?: Array<inputObject>;
    outputs?: Array<Object>;
    payable?: boolean;
    stateMutability?: "pure" | "view" | "nonpayable" | "payable";
    anonymous?: boolean;
    constant?: boolean;
}

export function update(compilerVersion: string, abi: Array<ABI>): Array<ABI> {
    let hasConstructor: boolean = false;
    let hasFallback: boolean = false;

    for (let i: number = 0; i < abi.length; i++) {
        const item: ABI = abi[i];

        if (item.type === 'constructor') {
            hasConstructor = true;

            // <0.4.5 assumed every constructor to be payable
            if (semver.lt(compilerVersion, '0.4.5')) {
                item.payable = true;
            }
        } else if (item.type === 'fallback') {
            hasFallback = true;
        }

        if (item.type !== 'event') {
            // add 'payable' to everything
            if (semver.lt(compilerVersion, '0.4.0')) {
                item.payable = true;
            }

            // add stateMutability field
            if (semver.lt(compilerVersion, '0.4.16')) {
                if (item.payable) {
                    item.stateMutability = 'payable';
                } else if (item.constant) {
                    item.stateMutability = 'view';
                } else {
                    item.stateMutability = 'nonpayable';
                }
            }
        }
    }

    // 0.1.2 from Aug 2015 had it. The code has it since May 2015 (e7931ade)
    if (!hasConstructor && semver.lt(compilerVersion, '0.1.2')) {
        abi.push({
            type: 'constructor',
            payable: true,
            stateMutability: 'payable',
            inputs: []
        });
    }

    if (!hasFallback && semver.lt(compilerVersion, '0.4.0')) {
        abi.push({
            type: 'fallback',
            payable: true,
            stateMutability: 'payable'
        });
    }

    return abi;
}
