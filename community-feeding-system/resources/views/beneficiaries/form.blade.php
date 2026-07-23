<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
        <label class="block mb-1">Beneficiary Code</label>
        <input type="text" name="beneficiary_code" value="{{ old('beneficiary_code', $beneficiary->beneficiary_code ?? '') }}" class="w-full border rounded p-2">
        @error('beneficiary_code') <div class="text-red-600 text-sm">{{ $message }}</div> @enderror
    </div>

    <div>
        <label class="block mb-1">First Name</label>
        <input type="text" name="first_name" value="{{ old('first_name', $beneficiary->first_name ?? '') }}" class="w-full border rounded p-2">
        @error('first_name') <div class="text-red-600 text-sm">{{ $message }}</div> @enderror
    </div>

    <div>
        <label class="block mb-1">Middle Name</label>
        <input type="text" name="middle_name" value="{{ old('middle_name', $beneficiary->middle_name ?? '') }}" class="w-full border rounded p-2">
        @error('middle_name') <div class="text-red-600 text-sm">{{ $message }}</div> @enderror
    </div>

    <div>
        <label class="block mb-1">Last Name</label>
        <input type="text" name="last_name" value="{{ old('last_name', $beneficiary->last_name ?? '') }}" class="w-full border rounded p-2">
        @error('last_name') <div class="text-red-600 text-sm">{{ $message }}</div> @enderror
    </div>

    <div>
        <label class="block mb-1">Sex</label>
        <select name="sex" class="w-full border rounded p-2">
            <option value="">Select Sex</option>
            <option value="Male" {{ old('sex', $beneficiary->sex ?? '') == 'Male' ? 'selected' : '' }}>Male</option>
            <option value="Female" {{ old('sex', $beneficiary->sex ?? '') == 'Female' ? 'selected' : '' }}>Female</option>
        </select>
        @error('sex') <div class="text-red-600 text-sm">{{ $message }}</div> @enderror
    </div>

    <div>
        <label class="block mb-1">Birth Date</label>
        <input type="date" name="birth_date" value="{{ old('birth_date', $beneficiary->birth_date ?? '') }}" class="w-full border rounded p-2">
        @error('birth_date') <div class="text-red-600 text-sm">{{ $message }}</div> @enderror
    </div>

    <div>
        <label class="block mb-1">Guardian Name</label>
        <input type="text" name="guardian_name" value="{{ old('guardian_name', $beneficiary->guardian_name ?? '') }}" class="w-full border rounded p-2">
        @error('guardian_name') <div class="text-red-600 text-sm">{{ $message }}</div> @enderror
    </div>

    <div>
        <label class="block mb-1">Guardian Contact</label>
        <input type="text" name="guardian_contact" value="{{ old('guardian_contact', $beneficiary->guardian_contact ?? '') }}" class="w-full border rounded p-2">
        @error('guardian_contact') <div class="text-red-600 text-sm">{{ $message }}</div> @enderror
    </div>

    <div class="md:col-span-2">
        <label class="block mb-1">Address</label>
        <textarea name="address" class="w-full border rounded p-2">{{ old('address', $beneficiary->address ?? '') }}</textarea>
        @error('address') <div class="text-red-600 text-sm">{{ $message }}</div> @enderror
    </div>

    <div>
        <label class="block mb-1">Purok</label>
        <select name="purok_id" class="w-full border rounded p-2">
            <option value="">Select Purok</option>
            @foreach($puroks as $purok)
                <option value="{{ $purok->id }}" {{ old('purok_id', $beneficiary->purok_id ?? '') == $purok->id ? 'selected' : '' }}>
                    {{ $purok->purok_name }}
                </option>
            @endforeach
        </select>
        @error('purok_id') <div class="text-red-600 text-sm">{{ $message }}</div> @enderror
    </div>

    <div>
        <label class="block mb-1">Status</label>
        <select name="status" class="w-full border rounded p-2">
            <option value="Active" {{ old('status', $beneficiary->status ?? '') == 'Active' ? 'selected' : '' }}>Active</option>
            <option value="Inactive" {{ old('status', $beneficiary->status ?? '') == 'Inactive' ? 'selected' : '' }}>Inactive</option>
            <option value="Completed" {{ old('status', $beneficiary->status ?? '') == 'Completed' ? 'selected' : '' }}>Completed</option>
        </select>
        @error('status') <div class="text-red-600 text-sm">{{ $message }}</div> @enderror
    </div>
</div>

<div class="mt-4">
    <button type="submit" class="bg-green-600 text-white px-4 py-2 rounded">
        Save
    </button>
    <a href="{{ route('beneficiaries.index') }}" class="ml-2 text-gray-600">Cancel</a>
</div>