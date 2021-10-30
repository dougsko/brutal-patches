export interface Patch {
    id: number;
    title: string;
    description: string;
    sub_fifth: number;
    overtone: number;
    ultra_saw: number;
    saw: number;
    pulse_width: number;
    square: number;
    metalizer: number;
    triangle: number;
    cutoff: number;
    mode: number;
    resonance: number;
    env_amt: number;
    brute_factor: number;
    kbd_tracking: number;
    modmatrix: ModMatrixEntry[];
    octave: number;
    volume: number;
    glide: number;
    mod_wheel: number;
    amount: number;
    wave: number;
    rate: number;
    sync: number;
    env_amt_2: number;
    vca: number;
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    pattern: number;
    play: number;
    rate_2: number;
    created_at: string;
    updated_at: string;
    average_rating: string;
    [key: string]: any;
}

export interface ModMatrixEntry {
    source: string;
    target: string;
}