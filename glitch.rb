class Glitch
  def initialize(file_data)
    @file_data = file_data
  end

  def break!
    (rand(5) + 1).times do
      position = rand(@file_data.size)
      @file_data[position] = ~ @file_data[position]
    end
  end

  def image
    @file_data
  end
end

