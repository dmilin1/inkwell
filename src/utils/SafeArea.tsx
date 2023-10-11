type SafeArea = {
    left: number,
    right: number,
    top: number,
    bottom: number,
}

function pxStringToNumber(pxString: string) {
    return Number(pxString.replace('px', ''));
}

const SafeArea: SafeArea = {
    left: pxStringToNumber(getComputedStyle(document.documentElement).getPropertyValue('--sal')),
    right: pxStringToNumber(getComputedStyle(document.documentElement).getPropertyValue('--sar')),
    top: pxStringToNumber(getComputedStyle(document.documentElement).getPropertyValue('--sat')),
    bottom: pxStringToNumber(getComputedStyle(document.documentElement).getPropertyValue('--sab')),
}

export default SafeArea;